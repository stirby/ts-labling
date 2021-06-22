import "../styles/index.scss"

import type { AppContext  } from 'next/app'

import Cookies from "universal-cookie"

// @ts-ignore
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

MyApp.getInitialProps = async (appContext: AppContext) => {

  const cookies = new Cookies(appContext.ctx.req?.headers.cookie)

  // Auth Params
  const authCookieName = "authCookie";
  const passkey = process.env.PASSKEY;
  const usernames = ["aldot", "dcsl"];
  let password = cookies.get(authCookieName) 

  const auth = appContext.ctx.req?.headers.authorization;

  if (auth) {

    // Parse b64
    const login = Buffer.from(auth.split(" ")[1], "base64").toString("utf-8")

    // Split username and password
    const [uname, pass] = login.split(":");
    
    if (pass === passkey && usernames.includes(uname.toLowerCase())) {
      let completeCookie = authCookieName+"="+passkey+"-"+uname;
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