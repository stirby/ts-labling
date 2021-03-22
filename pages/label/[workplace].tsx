import React from "react";
import { GetServerSideProps } from "next";

import { ConnectMongo } from "../../src/database";
import * as BoxSDK from "box-node-sdk";

import Labeler from "../../src/Labeler";

// Server Props
interface Props {
  imageID: string;
  imageName: string;
  imageContent: string;
  workplaceID: string;
}

// Client Props
interface CompleteRequest {
  precipitation: string;
  congestion: {
    left: string;
    center: string;
    right: string;
  };
  reviewer: string;
  imageID: string;
  obstructed: boolean;
}

const validNames = ["DCSL", "ALDOT"];

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  let client = await ConnectMongo();
  let collection = client
    .db(process.env.MONGODB_DB)
    .collection("testingSamples");

  // Get workplace from context (url)
  const workplace = ctx.query.workplace as string;
  console.log(workplace);
  if (validNames.indexOf(workplace) == -1) {
    ctx.res.statusCode = 404;
    ctx.res.end();
  }

  // Labels submitted by user
  if (ctx.req.method === "POST") {
    // Prepare empty response to fufill func signature
    const emptyResponse = {
      props: {
        workplaceID: workplace,
        imageID: "",
        imageName: "",
        imageContent: "",
      },
    };

    // Parse request
    const data = await new Promise<string>((resolve, reject) => {
      const d: Uint8Array[] = [];
      ctx.req.on("data", (c) => d.push(c));
      ctx.req.on("end", () => resolve(Buffer.concat(d).toString()));
      ctx.req.on("error", () => reject());
    });
    const msg: CompleteRequest = JSON.parse(data);

    if (msg.obstructed) {
      // Sample marked as obstructed,
      await collection.findOneAndUpdate(
        { box_id: msg.imageID },
        {
          $set: { obstructed: true },
        },
        { upsert: false }
      );
      ctx.res.writeHead(200);
      ctx.res.write("Successfully marked sample as obstructed, Thank you.");
      ctx.res.end();
    }

    // Check for incomplete labels
    if (
      msg.precipitation === "" ||
      msg.congestion.left === "" ||
      msg.congestion.center === "" ||
      msg.congestion.right === ""
    ) {
      ctx.res.writeHead(500);
      ctx.res.write("Missing Labels - Please complete before submitting.");
      ctx.res.end();
      return emptyResponse;
    }

    // Update Sample in DB
    await collection.findOneAndUpdate(
      { box_id: msg.imageID },
      {
        $set: {
          reviewer: msg.reviewer,
          "labels.congestion.leftLane": msg.congestion.left,
          "labels.congestion.centerLane": msg.congestion.center,
          "labels.congestion.rightLane": msg.congestion.right,
          "labels.precipitation": msg.precipitation,
        },
      },
      { upsert: false }
    );

    ctx.res.writeHead(200);
    ctx.res.write("Successful Submission, Thank you.");
    ctx.res.end();
    return emptyResponse;
  }

  // Set up box folder
  const boxConfig = JSON.parse(
    Buffer.from(process.env.BOX_CONFIG!, "base64").toString()
  );
  console.log("- Box: Loaded Client Configuration.");
  const boxClient = await BoxSDK.getPreconfiguredInstance(
    boxConfig
  ).getAppAuthClient("user", process.env.BOX_USERKEY);
  console.log("- Box: Authenticated Client.");

  // Pre-define sample image data
  var imgProps = {
    workplaceID: workplace,
    imageID: "",
    imageName: "",
    imageContent: "data:image/jpeg;base64, ", // Initialize with expected format for html to decode base64
  };

  // Pull random sample from mongoDB
  const result = await collection
    .aggregate([{ $match: { reviewer: null } }, { $sample: { size: 1 } }])
    .toArray();

  // Set box id
  imgProps.imageID = result[0].box_id;
  imgProps.imageName = result[0].name;

  // Get readstream from boxclient
  const stream = await boxClient.files.getReadStream(imgProps.imageID);
  const data = await new Promise<Buffer>((resolve, reject) => {
    const d: Uint8Array[] = [];
    stream.on("data", (c: Uint8Array) => d.push(c));
    stream.on("end", () => resolve(Buffer.concat(d)));
    stream.on("error", () => reject());
  });
  imgProps.imageContent += data.toString("base64");

  // Close mongoDB
  client.close();
  return { props: imgProps };
};

// Page Delcaration
const LablingInterface: React.FC<Props> = (props) => {
  console.log("img ID:", props.workplaceID);
  return (
    <>
      <Labeler
        imageContent={props.imageContent}
        imageID={props.imageID}
        activePage={props.workplaceID.toLowerCase()}
      />

      <div>
        <h1>{props.workplaceID}</h1>
        <h1>{props.imageContent.length}</h1>
        <h1>{props.imageName}</h1>
        <h1>{props.imageID}</h1>
      </div>
    </>
  );
};

export default LablingInterface;
