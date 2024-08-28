import { useGrpcContext } from "./GrpcContext";
import {
  LsRequest,
  LsResponse,
  File,
  File_FileType,
} from "./contracts/contracts/api";
import { Empty } from "./contracts/google/protobuf/empty";
import { DateTime } from "luxon";
import { VsFile, VsFolder } from "solid-icons/vs";
import { Component, For, onMount, Show } from "solid-js";
import { createStore, produce, SetStoreFunction } from "solid-js/store";

type ExplorerFileData = File & {
  Selected: boolean;
  ClickTimestamp: number;
};

type ExplorerState = {
  Loading: boolean;
  Location: string;
  Files: Array<ExplorerFileData>;
  CurrentTime: string;
};

export const Explorer: Component = () => {
  const explorer = useGrpcContext().explorer;

  const [state, setState] = createStore<ExplorerState>({
    Loading: true,
    Location: ".",
    Files: new Array<ExplorerFileData>(),
    CurrentTime: "",
  });

  onMount(async () => {
    const stream = explorer.timeStream(Empty.create());
    stream.responses.onMessage((t) => {
      setState(
        "CurrentTime",
        DateTime.fromSeconds(Number(t.seconds)).toFormat("yyyy-LL-dd HH:mm:ss"),
      );
    });
    stream.responses.onError((e) => {
      setState("CurrentTime", JSON.stringify(e));
    });

    let response: LsResponse | null;
    let loc = localStorage.getItem("location");
    if (!loc) {
      loc = ".";
    }
    try {
      let r = await explorer.ls(
        LsRequest.create({
          location: loc,
        }),
      );
      response = r.response;
    } catch (e) {
      try {
        let r = await explorer.ls(
          LsRequest.create({
            location: ".",
          }),
        );
        response = r.response;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    setState(
      produce((s) => {
        s.Location = response.location;
        localStorage.setItem("location", response.location);
        s.Loading = false;
        s.Files.length = 0;
        s.Files = new Array<ExplorerFileData>(response.files.length);
        for (let i = 0; i < response.files.length; i++) {
          s.Files[i] = {
            ...response.files[i],
            Selected: false,
            ClickTimestamp: 0,
          };
        }
      }),
    );
  });

  return (
    <div class="px-4 py-2 rounded border border-base-content/30 w-fit">
      <div>{state.CurrentTime}</div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 text-lg">
          <div>File Explorer</div>
          <div
            class="loading loading-spinner loading-xs"
            classList={{
              ["hidden"]: !state.Loading,
            }}
          ></div>
        </div>
      </div>
      <div>Location {state.Location}</div>
      <div class="flex flex-col">
        <For each={state.Files}>
          {(file, index) => (
            <EFileItem file={file} setState={setState} index={index()} />
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
}> = (props) => {
  const explorer = useGrpcContext().explorer;
  const f = props.file;
  const index = props.index;
  const setState = props.setState;

  async function onClick() {
    if (
      f.fileType == File_FileType.DIR &&
      Date.now() - f.ClickTimestamp < 1500
    ) {
      setState("Loading", true);
      let res: LsResponse;
      try {
        const r = await explorer.ls(
          LsRequest.create({
            location: f.path,
          }),
        );
        res = r.response;
      } catch (e) {
        setState("Loading", false);
        console.error("ls", f.path, e);
        return;
      }

      setState(
        produce((s) => {
          localStorage.setItem("location", res.location);
          s.Location = res.location;
          s.Loading = false;
          s.Files.length = 0;
          s.Files = new Array<ExplorerFileData>(res.files.length);
          for (let i = 0; i < res.files.length; i++) {
            s.Files[i] = {
              ...res.files[i],
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
        {f.fileType === File_FileType.FILE ? <VsFile /> : <VsFolder />}
      </div>
      <div class="px-1.5 mr-auto truncate min-w-80">{f.name}</div>
      <div class="px-1.5 min-w-28 tabular-nums text-left mr-auto">
        <Show when={f.createdAt}>
          {(t) =>
            DateTime.fromSeconds(Number(t().seconds)).toFormat(
              "yyyy-LL-dd HH:mm:ss",
            )
          }
        </Show>
      </div>
      <div class="text-right px-1.5 min-w-20">{humanizeFileSize(f.size)}</div>
    </div>
  );
};

function humanizeFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.floor((bytes / Math.pow(1024, i)) * 100) / 100;

  return `${size.toString(10)} ${sizes[i]}`;
}
