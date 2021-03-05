import React from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { MongoClient } from "mongodb";
import * as BoxSDK from "box-node-sdk";

import { prependOnceListener } from "node:process";

interface Props {
  imageID: string;
  imageName: string;
  imageContent: string;
}

interface CompleteRequest {
  imageID: string;
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
    const data = await new Promise<string>((resolve, reject) => {
      const d: Uint8Array[] = [];
      ctx.req.on("data", (c) => d.push(c));
      ctx.req.on("end", () => resolve(Buffer.concat(d).toString()));
      ctx.req.on("error", () => reject());
    });
    const msg: CompleteRequest = JSON.parse(data);

    console.log(msg)

    ctx.res.writeHead(200);
    ctx.res.write("success!");
    ctx.res.end();

    // We return empty props here just to fufill the func...
    // The request ends above.
    return {
      props: {
        imageID: "",
        imageName: "",
        imageContent: "",
      },
    };
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
  client.close()

  return {
    props: imgProps,
  };
};

// Page Delcaration
const Index: React.FC<Props> = (props) => {
  // Holds state as to whether the app is submitting a request or not.
  const [submitting, setSubmitting] = React.useState(false);
  // Holds state as to whether the app recieved an error from an API request.
  const [error, setError] = React.useState("");

  // Holds state for the sample's "company" label
  const [companyLabel, setCompanyLabel] = React.useState("");

  console.log("- Props.ImageContent:", props.imageContent);

  // Submits to `/`... aka getServerSideProps then
  // routes inside the POST block.
  const submit = () => {
    setSubmitting(true);
    const request: CompleteRequest = {
      imageID: "",
    };

    fetch("/", {
      body: JSON.stringify(request),
      method: "POST",
    })
      .then(() => {
        // We reload since we get new data on each load.
        window.location.reload();
        setTimeout(() => {
          setSubmitting(false);
        }, 5000);
      })
      .catch((ex) => {
        setError(ex.toString());
        setSubmitting(false);
      });
  };

  return (
    <>
      <Head>
        <meta name="theme-color" content="rgb(0, 0, 0)" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        </Head>


        <style global jsx>{`
          body {
            font-family: 'Cabin', sans-serif;
          }
        `}</style>
      

      <body>

        <div className="headerGrid">
          <text className="headText">TrafficNet - Labeling Interface</text>
          {error}
        </div>

        <div className="sampleGrid">
          
         
          
          <div className="sampleTray">
            
            <img 
              src={props.imageContent}
              alt={props.imageID}
            />
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
              title="Company"
              options={["audi", "volvo", "ford"]}
              onChange={(value) => {
                setCompanyLabel(value);
              }}
            ></Radios>

            
            <button className="submitChoice" disabled={submitting} onClick={submit}>
              Submit
            </button>
            <button className="skipChoice" disabled={false}>
              New Sample
            </button>
            
          
          </div>
        

        </div>
      </body>
    </>
  );
};

export default Index;

const Radios: React.FC<{
  title: string;
  options: string[];
  onChange: (value: string) => void;
}> = (props) => {
  const [selectedValue, setSelectedValue] = React.useState(props.options[0]);

  return (
    <div>
      <h3>{props.title}</h3>
      {props.options.map((value: string) => {
        return (
          //
          <React.Fragment key={value}>
            <input
              type="radio"
              name={props.title}
              value={value}
              checked={value == selectedValue}
              onChange={(event) => {
                console.log(value);
                setSelectedValue(event.target.value);
                props.onChange(event.target.value);
              }}
            />
            <label>{value}</label>
          </React.Fragment>
        );
      })}
    </div>
  );
};
