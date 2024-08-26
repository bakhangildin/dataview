import { ExplorerClient } from "./contracts/api.client";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { createContext, ParentComponent, useContext } from "solid-js";

type GrpcContext = {
  explorer: ExplorerClient;
};

const ctx = createContext<GrpcContext>();

export function useGrpcContext() {
  const c = useContext(ctx);
  if (c === undefined) {
    throw new Error("use only inside of GrpcProvider");
  }
  return c;
}

export const GrpcProvider: ParentComponent = (props) => {
  const transport = new GrpcWebFetchTransport({
    format: "binary",
    baseUrl: new URL(
      "/grpc",
      import.meta.env.VITE_API_BASE_URL || window.location.origin,
    ).toString(),
  });

  const value: GrpcContext = {
    explorer: new ExplorerClient(transport),
  };

  return <ctx.Provider value={value}>{props.children}</ctx.Provider>;
};
