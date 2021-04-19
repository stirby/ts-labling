import "../styles/index.scss"

import type { AppContext  } from 'next/app'

import Cookies from "universal-cookie"

// @ts-ignore
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

MyApp.getInitialProps = async (appContext: AppContext) => {

  const passkey = "tra";

  const cookieName = "authCookie";
  
  const auth = appContext.ctx.req?.headers.authorization;

  const cookies = new Cookies(appContext.ctx.req?.headers.cookie)
  let password = cookies.get(cookieName) 

  if (auth) {
    // Parse b64
    const login = Buffer.from(auth.split(" ")[1], "base64").toString("utf-8")
    const [_, pass] = login.split(":");

    if (pass === passkey) {
      appContext.ctx.res?.setHeader("Set-Cookie", cookieName+"="+passkey)
      password = passkey;
    }
  }
    
  
  if (password != passkey) {
    appContext.ctx.res?.setHeader("WWW-Authenticate", "basic");
    (appContext.ctx.res as any).statusCode = 401;
    appContext.ctx.res?.end();
    return
  } 
  return {}
}

export default MyApp;