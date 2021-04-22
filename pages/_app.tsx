import "../styles/index.scss"

import type { AppContext  } from 'next/app'

import Cookies from "universal-cookie"

// @ts-ignore
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

MyApp.getInitialProps = async (appContext: AppContext) => {

  // Valid password 
  const passkey = process.env.PASSKEY;

  // Valid usernames
  const usernames = ["aldot", "dcsl"];

  // Get Cookie by label
  const cookieName = "authCookie";

  // Get auth from http header
  const auth = appContext.ctx.req?.headers.authorization;

  // Set Cookie with password
  const cookies = new Cookies(appContext.ctx.req?.headers.cookie)
  let password = cookies.get(cookieName) 

  if (auth) {
    
    // Parse b64
    const login = Buffer.from(auth.split(" ")[1], "base64").toString("utf-8")
    

    console.log(">> login string recieved: ", login)

    // Split username and password
    const [uname, pass] = login.split(":");

    
    if (pass === passkey && usernames.includes(uname.toLowerCase())) {
      let completeCookie = cookieName+"="+passkey+"-"+uname;
      console.log("Saving Cookie:", completeCookie)
      appContext.ctx.res?.setHeader("Set-Cookie", completeCookie)
      password = passkey;
    }
  }
    
  
  if (password != passkey) {
    appContext.ctx.res?.setHeader("WWW-Authenticate", "basic");
    (appContext.ctx.res as any).statusCode = 401;
    appContext.ctx.res?.end();
    return {}
  } 
  return {}
}
export default MyApp;