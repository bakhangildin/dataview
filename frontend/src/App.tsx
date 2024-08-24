import { Component } from "solid-js";
import { Client } from "./rpc";
import { Explorer } from "./explorer";

export const App: Component = () => {
	const cl = new Client("http://localhost:4000/rpc");

	return (
		<div>
			<Explorer cl={cl} />
		</div>
	);
};
