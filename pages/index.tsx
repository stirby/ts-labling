import React from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { MongoClient } from "mongodb";
import * as BoxSDK from "box-node-sdk";

import { prependOnceListener } from "node:process";
import { type } from "os";

interface Props {
  imageID: string;
  imageName: string;
  imageContent: string;
}

interface CompleteRequest {
  precipitation: string;
  congestionNorth: string;
  congestionSouth: string;
  artifact: string;
  imageID: string;
}

// Label range reference
const labelSet = {
  
  // Applied to north and south selection. Only one may be selected.
  congestion: ["congested", "non-congested", "unclear"],

  // Precipitation artifact, fog can be general only one may be selected. 
  precipitation: ["rain", "snow", "fog", "clear"],

  // Position artifact refers to photos where the camera aimed toward the highway.
  // Lens referring to glare, obstruction
  // environment referring to some physical anomaly to be inspected. 
  artifact: ["position", "lens", "environment", "no-artifact"]
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }

  const mongoDB = process.env.MONGODB_DB;
  if (!mongoDB) {
    throw new Error(
      "Please define the MONGODB_DB environment variable inside .env.local"
    );
  }

  const client = await MongoClient.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(mongoDB);
  const collection = db.collection("testingSamples");

  console.log("Connected to MongoDB.");

  // Labels submitted by user
  if (ctx.req.method === "POST") {
    // We return empty props here just to fufill the func...
    // The request ends above.
    const emptyResponse = {
      props: {
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

    // Check for incomplete labels
    if (msg.precipitation === "" || msg.artifact === "" || msg.congestionNorth === "" || msg.congestionSouth === "") {
      ctx.res.writeHead(500);
      ctx.res.write(
        "Missing Labels: 'carLabel' - Please complete before submitting."
      );
      ctx.res.end();
      return emptyResponse;
    }

    // Update Sample in DB
    const query = await collection.findOneAndUpdate(
      { box_id: msg.imageID },
      {
        $set: { review: "complete", 
                "labels.artifact": msg.artifact,
                "labels.congestion.north": msg.congestionNorth,
                "labels.congestion.south": msg.congestionSouth, 
                "labels.precipitation": msg.precipitation},
      },
      { upsert: false }
    );

    ctx.res.writeHead(200);
    ctx.res.write("Successful Submission, Thank you :)");
    ctx.res.end();
    return emptyResponse;
  }

  // Set up box folder
  const boxConfig = JSON.parse(
    Buffer.from(process.env.BOX_CONFIG, "base64").toString()
  );
  console.log("- Box: Loaded Client Configuration.");
  const boxClient = await BoxSDK.getPreconfiguredInstance(
    boxConfig
  ).getAppAuthClient("user", process.env.BOX_USERKEY);
  console.log("- Box: Authenticated Client.");

  // Pre-define sample image data
  var imgProps = {
    imageID: "",
    imageName: "",
    imageContent: "data:image/jpeg;base64, ", // Initialize with expected format for html to decode base64
  };

  // Pull random sample from mongoDB
  const result = await collection
    .aggregate([{ $match: { review: null } }, { $sample: { size: 1 } }])
    .toArray();

  // Set box id
  imgProps.imageID = result[0].box_id;
  imgProps.imageName = result[0].name;

  // Get readstream from boxclient
  const stream = await boxClient.files.getReadStream(imgProps.imageID);
  const data = await new Promise<Buffer>((resolve, reject) => {
    const d: Uint8Array[] = [];
    stream.on("data", (c) => d.push(c));
    stream.on("end", () => resolve(Buffer.concat(d)));
    stream.on("error", () => reject());
  });
  imgProps.imageContent += data.toString("base64");

  // Close mongoDB
  client.close();
  return { props: imgProps };
};

// Page Delcaration
const Index: React.FC<Props> = (props) => {
  // Holds state as to whether the app is submitting a request or not.
  const [submitting, setSubmitting] = React.useState(false);

  // Holds state as to whether the app recieved an error from an API request.
  const [error, setError] = React.useState("");

  // Holds state as to whether the client is currently submitting a sample to the server
  const [status, setStatus] = React.useState("");

  //* Label States
  // Holds state for the sample's "has_Cars" label
  const [precipitation, setPrecip] = React.useState(""),
        [artifact, setArtifact] = React.useState(""),
        [congestionNorth, setCongestNorth] = React.useState(""),
        [congestionSouth, setCongestSouth] = React.useState("");
        


  // Submits to `/`... aka getServerSideProps then
  // routes inside the POST block.
  const submit = () => {
    setSubmitting(true);

    if (precipitation === "" || artifact === "" || congestionNorth === "" || congestionSouth === "") {
      console.log("Submission falied, incomplete labels.");
    }

    const request: CompleteRequest = {
      precipitation: precipitation,
      artifact: artifact,
      congestionNorth: congestionNorth,
      congestionSouth: congestionSouth,
      imageID: props.imageID,
    };

    fetch("/", {
      body: JSON.stringify(request),
      method: "POST",
    })
      .then(async (response) => {
        if (response.status === 500) {
          setError(await response.text());
          setSubmitting(false);
          return;
        } else if (response.status === 200) {
          // Success Message Display
          setError("");
          setStatus(await response.text())
        }
        window.location.reload();
      })
      .catch((ex) => {
        setError(ex.toString());
        setSubmitting(false);
      });
  };

  const newSample = () =>{
    window.location.reload()
  }

  return (
    <>
      <Head>
        <meta name="theme-color" content="rgb(0, 0, 0)" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <style global jsx>{`
        body {
          font-family: "Cabin", sans-serif;
        }
      `}</style>

      <body>
        <div className="headerGrid">
          <text className="headText">TrafficNet - Labeling Interface</text>
        </div>

        <div className="sampleGrid">
          <div className="sampleTray">
            <img src={props.imageContent} alt={props.imageID} />
          </div>

          <div className="labels">
            <text className="labelHead">Active Sample</text>
            <ul>
              <li className="sampleData">ID: {props.imageID}</li>
              <li className="sampleData">File: {props.imageName}</li>
            </ul>

            <br></br>

            <text className="labelHead">Label Fields</text>
            <Radios
              title="Congestion - North"
              options={labelSet.congestion}
              onChange={(value) => {
                setCongestNorth(value);
              }}
            ></Radios>

            <Radios
              title="Congestion - South"
              options={labelSet.congestion}
              onChange={(value) => {
                setCongestSouth(value);
              }}
            ></Radios>

            <Radios
              title="Precipitation"
              options={labelSet.precipitation}
              onChange={(value) => {
                setPrecip(value);
              }}
            ></Radios>

            <Radios
              title="Artifact"
              options={labelSet.artifact}
              onChange={(value) => {
                setArtifact(value);
              }}
            ></Radios>

            <button
              className="submitChoice"
              disabled={submitting}
              onClick={submit}
            >
              Submit
            </button>
            <button className="skipChoice" disabled={submitting} onClick={newSample}>
              New Sample
            </button>


          </div>
          <text className="err">{error}</text>
          <text className="status">{status}</text>
        </div>
        

        
      </body>
    </>
  );
};

export default Index;

/* React Functional Component
* Creates a renderable custom react component
*
*/
const Radios: React.FC<{
  title: string;
  options: string[];
  onChange: (value: string) => void;
}> = (props) => {
  const [selectedValue, setSelectedValue] = React.useState("");

  return (
    <div className="radioBox">
      <text className="radioTitle">{props.title}</text>
      {props.options.map((value: string) => {
        return (
          <React.Fragment key={value}>
            <div className="radioOpt">
              <input
                type="radio"
                name={props.title}
                value={value}
                checked={value == selectedValue}
                onChange={(event) => {
                  console.log("Updated Label '" + props.title + "' to:", value);
                  setSelectedValue(event.target.value);
                  props.onChange(event.target.value);
                }}
              />
              <label>{value}</label>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
