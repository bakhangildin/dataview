import { Component, For, onMount } from "solid-js";
import { Client, File } from "./rpc";
import { createStore, produce, SetStoreFunction } from "solid-js/store";
import { VsFile, VsFolder } from "solid-icons/vs";

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
		const res = await cl.ls(".");
		if (res.kind !== "success") return;

		setState(
			produce((s) => {
				s.Location = res.data.Location;
				s.Loading = false;
				s.Files.length = 0;
				s.Files = new Array<ExplorerFileData>(res.data.Files.length + 1);
				s.Files[0] = parentDir;
				for (let i = 0; i < res.data.Files.length; i++) {
					s.Files[i + 1] = {
						...res.data.Files[i],
						Selected: false,
						ClickTimestamp: 0,
					};
				}
			}),
		);
	});

	return (
		<div class="px-4 py-2">
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
			<div class="flex w-min flex-col gap-0.5">
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
				return;
			}

			setState(
				produce((s) => {
					s.Location = res.data.Location;
					s.Loading = false;
					s.Files.length = 0;
					s.Files = new Array<ExplorerFileData>(res.data.Files.length + 1);
					s.Files[0] = parentDir;
					for (let i = 0; i < res.data.Files.length; i++) {
						s.Files[i + 1] = {
							...res.data.Files[i],
							Selected: false,
							ClickTimestamp: 0,
						};
					}
				}),
			);
		}

		setState(
			produce((s) => {
				s.Files[index].Selected = !f.Selected;
				s.Files[index].ClickTimestamp = Date.now();
			}),
		);
	}

	return (
		<div
			class="flex cursor-pointer select-none items-center gap-1 rounded border border-base-content/30 px-2.5 py-0.5"
			onClick={onClick}
			classList={{
				["border-info-content"]: f.Selected,
			}}
		>
			{f.Type === "f" ? <VsFile /> : <VsFolder />}
			{f.Name}
		</div>
	);
};

const parentDir: ExplorerFileData = {
	Name: "..",
	Type: "d",
	Size: 0,
	CreatedAt: 0,
	Path: "..",
	Selected: false,
	ClickTimestamp: 0,
};
