import "@milejs/core/mile.css";
import { App } from "@milejs/core/app";
import { Providers } from "../providers";
import { components } from "./components";

export default function Page({
  params,
}: {
  params: Promise<{ mileApp?: string[] }>;
}) {
  // return (
  //   <Providers>
  //     <App params={params} components={components} />
  //   </Providers>
  // );
  return <App params={params} components={components} />;
}
