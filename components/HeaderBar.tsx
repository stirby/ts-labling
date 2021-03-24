import React from "react";
import Link from "next/link";

const HeaderBar: React.FC<{
  activePage: string;
}> = (props) => {
  let classNames: string[] = [];
  ["home", "dcsl", "aldot"].forEach((item, _) => {
    if (item === props.activePage) {
      classNames.push("nav " + "activePage");
    } else {
      classNames.push("nav");
    }
  });

  return (
    <div className="headerGrid">
      <div>
        <text className="headText">TrafficNet - Labeling Interface</text>
      </div>

      <div className="navBox">
        <div>
          <Link href="/">
            <a className={classNames[0]}>Home</a>
          </Link>
        </div>

        <div>
          <Link href="/label/dcsl">
            <a className={classNames[1]}>DCSL</a>
          </Link>
        </div>
        <div>
          <Link href="/label/aldot">
            <a className={classNames[2]}>ALDOT</a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
