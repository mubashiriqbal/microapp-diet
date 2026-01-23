import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/globals.css"
import type { AppProps } from "next/app"
import Head from "next/head"
import NavBar from "../components/NavBar"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <NavBar />
      <Component {...pageProps} />
    </>
  )
}
