import axios from "axios";

/*****************************************************************************/
/* METHODS                                                                   */
/*****************************************************************************/
enum Methods {
	cd = "Explorer.Cd",
	ls = "Explorer.Ls",
}

type MethodsMap = {
	[Methods.cd]: [Location, Empty];
	[Methods.ls]: [Location, LsR];
};

/*****************************************************************************/
/* PARAMS AND RESULT TYPES                                                   */
/*****************************************************************************/
export type File = {
	Name: string;
	Path: string;
	Type: "f" | "d";
	Size: number;
	CreatedAt: number;
};

type Location = {
	Location: string;
};

type LsR = {
	Files: File[];
} & Location;

type Empty = {};

/*****************************************************************************/
/* INTERNAL                                                                  */
/*****************************************************************************/
type ApiResp<T> =
	| { data: T; kind: "success" }
	| { data: string; kind: "error" };

export class Client {
	async cd(location: string) {
		return await this.call(Methods.cd, { Location: location });
	}

	async ls(location: string) {
		return await this.call(Methods.ls, { Location: location });
	}

	cl: JSONRPCClient;
	id: number;
	constructor(url: string) {
		this.cl = new JSONRPCClient(url);
		this.id = 0;
	}

	async call<M extends Methods>(m: M, p: PT[M]): Promise<ApiResp<RT[M]>> {
		const response = await this.cl.call<RT[M]>({
			jsonrpc: "2.0",
			id: this.id++,
			method: m,
			params: p,
		});
		if (response.result) {
			return {
				kind: "success",
				data: response.result,
			};
		} else if (response.error) {
			return {
				kind: "error",
				data: response.error.message,
			};
		} else {
			return {
				kind: "error",
				data: "ApiClient.call unreachable",
			};
		}
	}
}

type Request = {
	jsonrpc: "2.0";
	id: number;
	method: string;
	params?: object;
};

type Response<T> = {
	jsonrpc: "2.0";
	id: number;
	result?: T;
	error?: {
		message: string;
	};
};

class JSONRPCClient {
	url: string;
	constructor(url: string) {
		this.url = url;
	}

	async call<T>(r: Request): Promise<Response<T>> {
		try {
			const response = await axios.post<Response<T>>(this.url, r, {
				headers: { "Content-Type": "application/json" },
			});
			return response.data;
		} catch (e) {
			const msg = e instanceof Error ? e.message : JSON.stringify(e);
			return {
				jsonrpc: "2.0",
				id: r.id,
				error: {
					message: `${r.method} failed: ${msg}`,
				},
			};
		}
	}
}

type PT = {
	[K in keyof MethodsMap]: MethodsMap[K][0];
};
type RT = {
	[K in keyof MethodsMap]: MethodsMap[K][1];
};
