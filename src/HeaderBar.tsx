import React from "react";
import Link from "next/link";

const HeaderBar: React.FC<{
  activePage: string;
}> = (props) => {
  let classNames: string[] = [];
  ["home", "dcsl", "aldot"].forEach( (item, _) =>  {
    if (item === props.activePage) {
      classNames.push("nav " + item + " activePage");
    } else {
      classNames.push("nav " + item);
    }
  })

  return (
    <div className="headerGrid">
      <text className="headText">TrafficNet - Labeling Interface</text>

      <Link href="/">
        <a className={classNames[0]}>Home</a>
      </Link>

      <Link href="/label/dcsl">
        <a className={classNames[1]}>DCSL</a>
      </Link>

      <Link href="/label/aldot">
        <a className={classNames[2]}>ALDOT</a>
      </Link>
    </div>
  );
};

export default HeaderBar;
