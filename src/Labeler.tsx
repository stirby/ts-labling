import React from "react";
import Head from "next/head";

// Local
import HeaderBar from "./HeaderBar";

// From Material UI
import Tooltip from "@material-ui/core/Tooltip";
import { withStyles } from "@material-ui/core/styles";

// Label range reference
const labelSet = {
  // Applied to north and south selection. Only one may be selected.
  congestion: ["unclear", "congested", "vacant"],

  // Precipitation artifact, fog can be general only one may be selected.
  precipitation: ["rain", "snow", "fog", "clear"],

  // Placeholder, needs to be text input that doesn't refresh for the client on submission
  reviewer: ["DCSL", "ALDOT"],
};

// Tooltips for each label selection
const tooltipText = {
  // Congestion - Left Lane
  congestion: {
    leftLane:
      "Left lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such.",
    rightLane:
      "Right lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such.",
    centerLane:
      "Center lane congestion on the eastbound highway. If the condition of the lane is unclear, mark it as such.",
  },
  precipitation: "Indicate any precipitation that appears in the active image.",
  reviewer: "Your workplace, to maintain consistency and accuracy.",

  // Button Tooltips
  obstructed:
    "Use this to mark images that are unusable for classification, whether the camera is angled in the wrong direction or some obstacle blocks the view. Once clicked, the image will be ’tossed out,’ and a new image will be drawn.",
  submit:
    "Applies all currently selected labels to the active image, saves it to the database, and draws a new image for labeling.",
  newSample:
    "Simply draws a random image from the database and restores all label options to their default selection.",
};

interface labelerProps {
  imageID: string;
  imageContent: string;
  activePage: string;
}

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

// Page Delcaration
const Labeler: React.FC<labelerProps> = (props) => {
  // Holds state as to whether the app is submitting a request or not.
  const [submitting, setSubmitting] = React.useState(false);

  // Holds state as to whether the app recieved aorthn error from an API request.
  const [error, setError] = React.useState("");

  // Holds state as to whether the client is currently submitting a sample to the server
  const [status, setStatus] = React.useState("");

  //* Label States
  // Holds state for the sample's "has_Cars" label
  const [precipitation, setPrecip] = React.useState(""),
    [congestionLeft, setCongestLeft] = React.useState(""),
    [congestionCenter, setCongestCenter] = React.useState(""),
    [congestionRight, setCongestRight] = React.useState(""),
    [reviewer, setReviewer] = React.useState("");

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
      reviewer: reviewer,
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
          setStatus(await response.text());
        }
        window.location.reload();
      })
      .catch((ex) => {
        setError(ex.toString());
        setSubmitting(false);
      });
  };

  // Optionally generate a new sample
  const newSample = () => {
    window.location.reload();
  };

  // Sample is obstructed
  const obstructed = () => {
    setSubmitting(true);

    const request: CompleteRequest = {
      precipitation: "",
      congestion: { left: "", center: "", right: "" },
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
          setError(await response.text());
          setSubmitting(false);
          return;
        } else if (response.status === 200) {
          // Success Message Display
          setError("");
          setStatus(await response.text());
        }
        window.location.reload();
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

      <body>
        <HeaderBar activePage={props.activePage} />

        <div className="sampleGrid">
          <div className="sampleTray">
            <img src={props.imageContent} alt={props.imageID} />
            <text className="sampleInfo">Image ID: {props.imageID}</text>
            <br></br>
          </div>

          <div className="labels">
            <text className="labelHead">Congestion Labels</text>
            <br></br>

            <div>
              <Radios
                labelTitle="Left Lane"
                tooltip={tooltipText.congestion.leftLane}
                default="vacant"
                options={labelSet.congestion}
                onChange={(value) => {
                  setCongestLeft(value);
                }}
              ></Radios>
            </div>

            <Radios
              labelTitle="Center Lane"
              tooltip={tooltipText.congestion.centerLane}
              default="vacant"
              options={labelSet.congestion}
              onChange={(value) => {
                setCongestCenter(value);
              }}
            ></Radios>

            <Radios
              labelTitle="Right Lane"
              tooltip={tooltipText.congestion.rightLane}
              default="vacant"
              options={labelSet.congestion}
              onChange={(value) => {
                setCongestRight(value);
              }}
            ></Radios>

            <br></br>
            <text className="labelHead">Enviroment Labels</text>
            <br></br>
            <Radios
              labelTitle="Precipitation"
              tooltip={tooltipText.precipitation}
              default="clear"
              options={labelSet.precipitation}
              onChange={(value) => {
                setPrecip(value);
              }}
            ></Radios>

            <Radios
              labelTitle="Reviewer"
              tooltip={tooltipText.reviewer}
              default={props.activePage.toUpperCase()}
              options={labelSet.reviewer}
              onChange={(value) => {
                setReviewer(value);
              }}
            ></Radios>

            <div className="navigationButtons">
              <LightTooltip title={tooltipText.submit}>
                <button
                  className="submitChoice"
                  disabled={submitting}
                  onClick={submit}
                >
                  Submit
                </button>
              </LightTooltip>

              <LightTooltip title={tooltipText.submit}>
                <button
                  className="skipChoice"
                  disabled={submitting}
                  onClick={newSample}
                >
                  New Sample
                </button>
              </LightTooltip>

              <LightTooltip title={tooltipText.obstructed}>
                <button
                  className="obstructed"
                  disabled={submitting}
                  onClick={obstructed}
                >
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
                    console.log(
                      "Updated Label '" + props.labelTitle + "' to:",
                      value
                    );
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
 */
const LightTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: theme.palette.common.white,
    color: "rgba(0, 0, 0, 0.87)",
    boxShadow: theme.shadows[1],
    fontSize: 16,
  },
}))(Tooltip);

export default Labeler;
