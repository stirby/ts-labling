import React from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { MongoClient } from "mongodb";
import * as BoxSDK from "box-node-sdk";
import Cookies from "universal-cookie"

// From Material UI
import Tooltip from '@material-ui/core/Tooltip';
import { withStyles } from '@material-ui/core/styles';


interface Props {
  imageID: string;
  imageContent: string;
  labelerID: string;
}

interface CompleteRequest {
  precipitation: string;
  congestion: {
    left: string;
    center: string;
    right: string;
  }
  reviewer: string;
  imageID: string;
  obstructed: boolean;
}

// Label range reference
const labelSet = {
  // Applied to north and south selection. Only one may be selected.
  congestion: ["unclear", "congested", "non-congested"],

  // Precipitation artifact, fog can be general only one may be selected. 
  precipitation: ["rain", "snow", "fog", "clear"]
}

// Tooltips for each label selection
const tooltipText = {
  // Congestion - Left Lane
  congestion: {
    leftLane: "Left lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such.",
    rightLane: "Right lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such.",
    centerLane: "Center lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such."
  },
  precipitation: "Indicate any precipitation that appears in the active image.",
  reviewer: "Your workplace, to maintain consistency and accuracy.",

  // Button Tooltips
  obstructed: "Use this to mark images that are unusable for classification, whether the camera is angled in the wrong direction or some obstacle blocks the view. Once clicked, the image will be ’tossed out,’ and a new image will be drawn. **Please use with caution** - this operation is not feasibly reversable.",
  submit: "Applies all currently selected labels to the active image, saves it to the database, and draws a new image for labeling.",
  newSample: "Simply draws a random image from the database and restores all label options to their default selection."
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

  // Establish Mongo
  const client = await MongoClient.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(mongoDB);
  const collection = db.collection("rawData");

  console.log("Connected to MongoDB.");

  // Labels submitted by user
  if (ctx.req.method === "POST") {
    // Prepare empty response to fufill func signature
    const emptyResponse = {
      props: {
        imageID: "",
        imageContent: "",
        labelerID: ""
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
      console.log(">>> Obstructed Server side.")
      // Sample marked as obstructed, 
      await collection.findOneAndUpdate(
        { box_id: msg.imageID },
        {
          $set: { reviewer: msg.reviewer,
                  obstructed: true },
        },
        { upsert: false }
      );
      ctx.res.writeHead(200);
      ctx.res.write("Successfully marked sample as obstructed, Thank you.");
      ctx.res.end();
      return emptyResponse;
    }

    // Check for incomplete labels
    if (msg.precipitation === "" ||  msg.congestion.left === "" || msg.congestion.center === "") {
      ctx.res.writeHead(500);
      ctx.res.write(
        "Missing Labels - Please complete before submitting."
      );
      ctx.res.end();
      return emptyResponse;
    }

    // Update Sample in DB
    await collection.findOneAndUpdate(
      { box_id: msg.imageID }, // Query
      { // Label updates
        $set: { reviewer: msg.reviewer, 
                "labels.congestion.leftLane": msg.congestion.left,
                "labels.congestion.centerLane": msg.congestion.center, 
                "labels.congestion.rightLane": msg.congestion.right, 
                "labels.precipitation": msg.precipitation},
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
    imageID: "",
    imageContent: "data:image/jpeg;base64, ", // Initialize with expected format for html to decode base64
    labelerID: "undefined"
  };

  // Verify Auth cookie
  const cookies = new Cookies(ctx.req?.headers.cookie)
  const authCookie = cookies.get("authCookie"); 
  if (authCookie) {
    imgProps.labelerID = authCookie.split("-")[1]
  }

  // Pull random sample from mongoDB
  const result = await collection
    .aggregate([{ $match: { reviewer: null } }, { $sample: { size: 1 } }])
    .toArray();

  // Set box id
  imgProps.imageID = result[0].box_id;

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
const Index: React.FC<Props> = (props) => {
  // Holds state as to whether the app is submitting a request or not.
  const [submitting, setSubmitting] = React.useState(false);

  // Holds state as to whether the app recieved aorthn error from an API request.
  const [error, setError] = React.useState("");

  // Holds state as to whether the client is currently submitting a sample to the server
  const [status, setStatus] = React.useState("");

  //* Label States
  // Holds state for the sample's "has_Cars" label
  const [precipitation, setPrecip] = React.useState(labelSet.precipitation[3]),
        [congestionLeft, setCongestLeft] = React.useState(labelSet.congestion[2]),
        [congestionCenter, setCongestCenter] = React.useState(labelSet.congestion[2]),
        [congestionRight, setCongestRight] = React.useState(labelSet.congestion[2]);
        

  // Submits to `/`... aka getServerSideProps then
  // routes inside the POST block.
  const submit = () => {
    setSubmitting(true);


    const request: CompleteRequest = {
      precipitation: precipitation,
      congestion: {
        left: congestionLeft,
        center: congestionCenter,
        right: congestionRight,
      },
      obstructed: false,
      reviewer: props.labelerID,
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

  // Optionally generate a new sample
  const newSample = () =>{
    window.location.reload()
  }


  // Sample is obstructed
  const obstructed = () => {
    setSubmitting(true);

    const request: CompleteRequest = {
      precipitation: "",
      congestion: { left: "", center: "", right: "", },
      obstructed: true,
      reviewer: "",
      imageID: "",
    };

    fetch("/", {
      body: JSON.stringify(request),
      method: "POST",
    })
      .then(async (response) => {
        if (response.status === 500) {
          console.log("Got code 500...")
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
  }

  return (
    <>
      <Head>
        <meta name="theme-color" content="rgb(0, 0, 0)" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <body>
        <div className="fullGrid headerBar">
          <text className="headerFont title">TrafficNet - Labeling Interface</text>
          <text className="headerFont labeler">Labeler: {props.labelerID.toUpperCase()}</text>
        </div>


        <div className="fullGrid sampleGrid">
          <div className="sampleTray">
            <img className="activeSample" src={props.imageContent} alt={props.imageID} />
            <text className="sampleID">Image ID: {props.imageID}</text><br></br>
            
          </div>

          <div className="labels">
            
            <text className="headerFont labelHead">Congestion Labels</text><br></br>
              
              <div>
                <Radios
                  labelTitle="Left Lane"
                  tooltip={tooltipText.congestion.leftLane}
                  default="non-congested"
                  options={labelSet.congestion}
                  onChange={(value) => {
                    setCongestLeft(value);
                  }}
                ></Radios>
              </div>


              <Radios
                labelTitle="Center Lane"
                tooltip={tooltipText.congestion.centerLane}
                default="non-congested"
                options={labelSet.congestion}
                onChange={(value) => {
                  setCongestCenter(value);
                }}
              ></Radios>

              <Radios
                labelTitle="Right Lane"
                tooltip={tooltipText.congestion.rightLane}
                default="non-congested"
                options={labelSet.congestion}
                onChange={(value) => {
                  setCongestRight(value);
                }}
              ></Radios>

            <br></br>
            <text className="headerFont labelHead">Enviroment Labels</text><br></br>
            <Radios
              labelTitle="Precipitation"
              tooltip={tooltipText.precipitation}
              default="clear"
              options={labelSet.precipitation}
              onChange={(value) => {
                setPrecip(value);
              }}
            ></Radios>



            <div className="navigationButtons">
              <LightTooltip title={tooltipText.submit}>
              <button
                className="buttonFont submitChoice"
                disabled={submitting}
                onClick={submit}
              >
                Submit
              </button>
              </LightTooltip>

              <LightTooltip title={tooltipText.newSample}>
              <button className="buttonFont skipChoice" disabled={submitting} onClick={newSample}>
                New Sample
              </button>
              </LightTooltip>

              <LightTooltip title={tooltipText.obstructed}>
              <button className="buttonFont obstructed" disabled={submitting} onClick={obstructed}>
                Mark Obstructed
              </button>
              </LightTooltip>
            </div>

          </div>
          <text className="err">{error}</text>
          <text className="status">{status}</text>
        </div>
        

        
      </body>
    </>
  );
};

export default Index;

/* 
* Radios - React Functional Component
* Creates a renderable custom radio element
*
* title: String to title this radio selection
* defualt: default selected option 
* options: list of string choices
* onChange: Callback for selection event. 
*/
const Radios: React.FC<{
  labelTitle: string;
  tooltip: string;
  default: string;
  options: string[];
  onChange: (value: string) => void;
}> = (props) => {
  const [selectedValue, setSelectedValue] = React.useState(props.default);

  return (
    <LightTooltip title={props.tooltip}>
    <div className="radioBox">
      <text className="radioTitle">{props.labelTitle}</text>
      {props.options.map((value: string) => {
        return (
          <React.Fragment key={value}>
            
              <div className="radioOpt">
                <input
                  type="radio"
                  name={props.labelTitle}
                  id={props.labelTitle}
                  value={value}
                  checked={value == selectedValue}
                  onChange={(event) => {
                    console.log("Updated Label '" + props.labelTitle + "' to:", value);
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
    </LightTooltip>
  );
};

/* From Google's Material UI: https://material-ui.com/components/tooltips/
*
*/
const LightTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: theme.palette.common.white,
    color: 'rgba(0, 0, 0, 0.87)',
    boxShadow: theme.shadows[1],
    fontSize: 16,
  },
}))(Tooltip);