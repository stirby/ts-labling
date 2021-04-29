import React from "react";
import Head from "next/head";


// Page Delcaration
const Examples = () => {

  return (
    <>
      <Head>
        <meta name="theme-color" content="rgb(0, 0, 0)" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>

      <body>
        <div>
          <h1>
            Examples Page
          </h1>
        </div>
        <div className="imgGrid">
          <div>
            <text>Lane Congestion Detail</text>
            <img src="/obstructed.jpg" alt="Obstructed Example"></img>
          </div>

          <div>
            <h2>Obstructed Example</h2>
          </div>

          <div>
            <h2>Rain Example</h2>
          </div>

          <div>
            <h2>Fog Example</h2>
          </div>

          <div>
            <h2>Snow Example</h2>
          </div>

          <div>
            <h2>Clear Example</h2>
            <img src="/clear.jpg" alt="Obstructed Example"></img>
          </div>

        </div>
      </body>
    </>
  );
};

export default Examples;