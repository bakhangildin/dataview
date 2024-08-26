/* @refresh reload */
import { App } from "./App";
import { GrpcProvider } from "./GrpcContext";
import "./index.css";
import { render } from "solid-js/web";

const root = document.getElementById("root");

if (root === null || !(root instanceof HTMLElement)) {
  throw new Error("Root element `#root` not found.");
}

render(
  () => (
    <GrpcProvider>
      <App />
    </GrpcProvider>
  ),
  root,
);
