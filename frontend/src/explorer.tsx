import { Component, For, onMount } from "solid-js";
import { Client, File } from "./rpc";
import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { VsFile, VsFolder } from "solid-icons/vs";
import { DateTime } from "luxon";

type ExplorerFileData = File & {
	Selected: boolean;
	ClickTimestamp: number;
};

type ExplorerState = {
	Loading: boolean;
	Location: string;
	Files: Array<ExplorerFileData>;
};

export const Explorer: Component<{ cl: Client }> = (props) => {
	const cl = props.cl;

	const [state, setState] = createStore<ExplorerState>({
		Loading: true,
		Location: ".",
		Files: new Array<ExplorerFileData>(),
	});

	onMount(async () => {
		let loc = localStorage.getItem("location")
		if (!loc) {
			loc = "."
		}
		let res = await cl.ls(loc);
		if (res.kind !== "success") {
			res = await cl.ls(".");
			if (res.kind !== "success") {
				return;
			}
		}

		setState(
			produce((s) => {
				s.Location = res.data.Location;
				localStorage.setItem("location", res.data.Location)
				s.Loading = false;
				s.Files.length = 0;
				s.Files = new Array<ExplorerFileData>(res.data.Files.length);
				for (let i = 0; i < res.data.Files.length; i++) {
					s.Files[i] = {
						...res.data.Files[i],
						Selected: false,
						ClickTimestamp: 0,
					};
				}
			}),
		);
	});

	return (
		<div class="px-4 py-2 rounded border border-base-content/30 w-fit">
			<div class="flex items-center gap-2">
				<div class="flex items-center gap-2 text-lg">
					<div>File Explorer</div>
					<div
						class="loading loading-spinner loading-xs"
						classList={{ ["hidden"]: !state.Loading }}
					></div>
				</div>
			</div>
			<div>Location {state.Location}</div>
			<div class="flex flex-col">
				<For each={state.Files}>
					{(file, index) => (
						<EFileItem
							cl={cl}
							file={file}
							setState={setState}
							index={index()}
						/>
					)}
				</For>
			</div>
		</div>
	);
};

const EFileItem: Component<{
	file: ExplorerFileData;
	setState: SetStoreFunction<ExplorerState>;
	index: number;
	cl: Client;
}> = (props) => {
	const cl = props.cl;
	const f = props.file;
	const index = props.index;
	const setState = props.setState;

	async function onClick() {
		if (f.Type === "d" && Date.now() - f.ClickTimestamp < 1500) {
			setState("Loading", true);
			const res = await cl.ls(f.Path);
			if (res.kind !== "success") {
				setState("Loading", false);
				console.error("ls", f.Path, res.data)
				return;
			}

			setState(
				produce((s) => {
					localStorage.setItem("location", res.data.Location)
					s.Location = res.data.Location;
					s.Loading = false;
					s.Files.length = 0;
					s.Files = new Array<ExplorerFileData>(res.data.Files.length);
					for (let i = 0; i < res.data.Files.length; i++) {
						s.Files[i] = {
							...res.data.Files[i],
							Selected: false,
							ClickTimestamp: 0,
						};
					}
				}),
			);
		} else {
			setState(
				produce((s) => {
					s.Files[index].Selected = !f.Selected;
					s.Files[index].ClickTimestamp = Date.now();
				}),
			);
		}
	}

	return (
		<div
			class="flex cursor-pointer select-none items-center px-0.5 divide-x divide-base-content/30"
			onClick={onClick}
			classList={{
				["bg-info-content/20"]: f.Selected,
			}}
		>
			<div class="px-1.5 text-left">
				{f.Type === "f" ? <VsFile /> : <VsFolder />}
			</div>
			<div class="px-1.5 mr-auto truncate min-w-80">
				{f.Name}
			</div>
			<div class="px-1.5 min-w-28 tabular-nums text-left mr-auto">
				{f.CreatedAt > 0 ? DateTime.fromSeconds(f.CreatedAt, { zone: "utc" }).toFormat("yyyy-LL-dd HH:mm:ss") : ""}
			</div>
			<div class="text-right px-1.5 min-w-20">
				{humanizeFileSize(f.Size)}
			</div>
		</div>
	);
};

function humanizeFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = Math.floor(bytes / Math.pow(1024, i) * 100) / 100;

	return `${size.toString(10)} ${sizes[i]}`;
}

