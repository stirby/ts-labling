import { GetServerSideProps } from "next";
import React from "react";
import { MongoClient } from "mongodb";
import { PromiseProvider } from "mongoose";
import * as BoxSDK from "box-node-sdk";


interface Props {
  imageID: string;
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

  if (ctx.req.method === "POST") {
    const data = await new Promise<string>((resolve, reject) => {
      const d: Uint8Array[] = [];
      ctx.req.on("data", (c) => d.push(c));
      ctx.req.on("end", () => resolve(Buffer.concat(d).toString()));
      ctx.req.on("error", () => reject());
    });
    const msg: CompleteRequest = JSON.parse(data);

    ctx.res.writeHead(200);
    ctx.res.write("success!");
    ctx.res.end();

    // We return empty props here just to fufill the func...
    // The request ends above.
    return {
      props: {
        imageID: "",
        imageContent: "",
      },
    };
  }


  
  await collection.aggregate([
      { $match:  { review: null } },
      { $sample: { size: 1 } }
  ]).toArray()
    .then((result) => {
        var myDoc = result[0];
    })
  
    console.log("- Mongo: Got random result from DB.");

  // Get Randomly selected sample from box client 
  const boxConfig = JSON.parse(Buffer.from(process.env.BOX_CONFIG, 'base64').toString());
  console.log("- Box: Loaded Client Configuration.")
  const boxClient = await BoxSDK.getPreconfiguredInstance(boxConfig).getAppAuthClient('user', process.env.BOX_USERKEY);
  console.log("- Box: Authenticated Client.")
  const rootFolder = await boxClient.folders.get(process.env.BOX_FOLDER)
  console.log("- Box: Got Folder: '"+ rootFolder.name + "'");
  
  
  return {
    props: {
      imageID: "",
      imageContent: "",
    },
  };
};

// Page Delcaration
const Index: React.FC<Props> = (props) => {
  // Holds state as to whether the app is submitting a request or not.
  const [submitting, setSubmitting] = React.useState(false);
  //   Holds state as to whether the app recieved an error from an API request.
  const [error, setError] = React.useState("");
  const [companyLabel, setCompanyLabel] = React.useState("");

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
        // window.location.reload();
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
    <div>
      {error}

      <button disabled={submitting} onClick={submit}>
        Submit
      </button>

      <h1>Hello Next.js 👋 {props.imageID}</h1>
      <Radios
        title="Company"
        options={["audi", "volvo", "ford"]}
        onChange={(value) => {
          setCompanyLabel(value);
        }}
      ></Radios>
    </div>
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
                console.log(value)
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
