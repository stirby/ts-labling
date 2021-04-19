import Head from "next/head"


export default function Protected(hasReadPermission: boolean) {
  if (!hasReadPermission) {
    return <div>Access denied.</div>
  }

  return (
    <div>
      <Head>
        <title>Protected Page</title>
      </Head>

      <main>"Stephen" was supposed to password protect this page.</main>
    </div>
  )
}