import "../mile.css";

import {
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  SetStateAction,
  useCallback,
  startTransition,
  useId,
  useImperativeHandle,
} from "react";
import {
  DraftData,
  DraftDataAction,
  DraftDataState,
  FieldDefinition,
  MileEditor,
  MileSchema,
  NodeData,
  Operation,
  PageData,
  SchemaTypeDefinition,
  TreeData,
} from "@milejs/types";
import { tinykeys } from "@/lib/tinykeys";
import ReactDOM, { flushSync } from "react-dom";
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  CircleCheckIcon,
  CircleXIcon,
  GripVerticalIcon,
  ImagesIcon,
  LaptopIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  SmartphoneIcon,
  SquareArrowOutUpRight,
  TabletIcon,
  TrashIcon,
} from "lucide-react";
import { invariant } from "@/lib/invariant";
import { Preview } from "./preview";
import { createChannel } from "bidc";
import { useMileProvider } from "./client";
import { Tree } from "./tree";
import { EditorProvider, useEditor } from "./editor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Input } from "@/components/ui/input";
import { Dashboard } from "./dashboard";
import useSWR, { mutate } from "swr";
import {
  convertBlocksToNodeData,
  convertNodeDataToBlocks,
  mdxToTree,
} from "./data";
import { generateId } from "@/lib/generate-id";
import { toast, Toaster } from "sonner";
import { Uploader, Uploaders } from "@/components/ui/uploader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@base-ui-components/react/dialog";
import { Field } from "@base-ui-components/react/field";
import { Checkbox } from "@base-ui-components/react/checkbox";
import { SlugInput } from "./shared";
import { Switch } from "@base-ui-components/react/switch";
// upload
import { useUploadFile } from "@better-upload/client";
// editor
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  DefaultReactSuggestionItem,
  FileCaptionButton,
  // FileReplaceButton,
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  NestBlockButton,
  SuggestionMenuController,
  TextAlignButton,
  UnnestBlockButton,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine"; // Or, you can use ariakit, shadcn, etc.
import "@blocknote/mantine/style.css"; // Default styles for the mantine editor
import "@blocknote/core/fonts/inter.css"; // Include the included Inter font
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
// dnd
// import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
// import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
// import { DragHandleButton } from "@atlaskit/pragmatic-drag-and-drop-react-accessibility/drag-handle-button";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  type ElementDropTargetEventBasePayload,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  makeUploadFile,
  saveImagesToDB,
  FileReplaceButton,
  UploadFilePanel,
  ImageGallery,
} from "./uploads";
import { Textarea } from "@/components/ui/textarea";
import { deepEqual } from "fast-equals";
import {
  DialogContent,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "./auth-client";

export { BlockNoteView, useCreateBlockNote };

const HEADER_HEIGHT = 40;
const NEXT_PUBLIC_HOST_URL = process.env.NEXT_PUBLIC_HOST_URL;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;
const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const fetcher = (key: string[]) =>
  fetch(`${API}${key.join("")}`).then((res) => res.json());

const resolvePath = (paths: string[] = []) => {
  const hasPath = paths.length > 0;
  const last_segment = hasPath ? paths[paths.length - 1] : "";
  const isEdit = last_segment === "__edit__";
  const isIframeContent = last_segment === "__iframe_content__";
  return {
    isEdit,
    isIframeContent,
    path: `/${(isEdit || isIframeContent ? [...paths].slice(0, paths.length - 1) : [...paths]).join("/")}`,
  };
};

export function Mile({
  params,
  searchParams,
}: {
  params: Promise<{ milePath?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { milePath } = use(params);
  const { isEdit, isIframeContent, path } = resolvePath(milePath);
  const search = use(searchParams);

  if (!isEdit && !isIframeContent) {
    return <Dashboard path={path} search={search} />;
  }

  return (
    <MileAuthGuard
      isEdit={isEdit}
      isIframeContent={isIframeContent}
      path={path}
      search={search}
    />
  );
}

function MileAuthGuard({
  isEdit,
  isIframeContent,
  path,
  search,
}: {
  isEdit: boolean;
  isIframeContent: boolean;
  path: string;
  search: { [key: string]: string | string[] | undefined };
}) {
  const {
    data: session,
    isPending: isSessionPending, //loading state
    error, //error object
    refetch, //refetch the session
  } = authClient.useSession();
  if (isSessionPending) return <div>Loading...</div>;
  if (!session) {
    window.location.assign("/mile/login");
    return null;
  }

  return (
    <MileInner
      isEdit={isEdit}
      isIframeContent={isIframeContent}
      path={path}
      search={search}
    />
  );
}

function MileInner({
  isEdit,
  isIframeContent,
  path,
  search,
}: {
  isEdit: boolean;
  isIframeContent: boolean;
  path: string;
  search: { [key: string]: string | string[] | undefined };
}) {
  const {
    data: page_data,
    error: pageError,
    isLoading: pageIsLoading,
  } = useSWR(isEdit ? [`/pages`, path] : null, fetcher);
  // console.log("path", path, isEdit, isIframeContent);

  if (pageError) return <div>failed to load</div>;
  if (pageIsLoading) return <div>Loading...</div>;
  if (isEdit && !page_data) {
    return <div>no data</div>;
  }

  if (isIframeContent) {
    return <Preview slug={path} />;
  }

  console.log("page_data", page_data);
  return <MileReady page_data={page_data} path={path} />;
}

const initial_empty_tree = {
  root: {
    type: "root",
    id: "root",
    props: {},
    options: {},
    children: [],
  },
};

function MileReady({
  path,
  page_data,
}: {
  path: string;
  page_data: DraftData;
}) {
  const tree_data = useMemo(() => {
    if (page_data && page_data.content) {
      if (typeof page_data.content === "string") {
        const { result, error } = mdxToTree(page_data.content);
        return new Tree(result.content);
      } else {
        return new Tree(page_data.content ?? {});
      }
    }
    return new Tree(initial_empty_tree);
  }, [page_data]);
  const [data, setData] = useState<TreeData | undefined>(() => tree_data.data);
  const [draft_data, updateDraftData] = useReducer(draftDataReducer, page_data);
  const [lastOperation, setLastOperation] = useState<Operation | null>(null);
  //
  const frameRef = useRef<IFrame | null>(null);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  // Create channel for parent->iframe communication
  useEffect(() => {
    if (!frameRef.current) return;
    if (!frameRef.current.contentWindow) return;
    const channel = createChannel(frameRef.current.contentWindow);
    channelRef.current = channel;
    return () => {
      channel.cleanup();
    };
  }, []);

  const setDataAndSend = useCallback(
    function setDataAndSend(
      value: SetStateAction<TreeData | undefined>,
      shouldSend = true,
    ) {
      if (!value) {
        console.log("no data");
        return;
      }
      setData(value);
      if (shouldSend) {
        channelRef.current?.send({
          kind: "update_data",
          data: value,
        });
      }
    },
    [setData],
  );

  // console.log('page_data ----', page_data);
  // console.log("MileReady render ---- data", data);
  // console.log("tree_data", tree_data);

  return (
    <>
      <EditorProvider
        draft_data={draft_data}
        updateDraftData={updateDraftData}
        tree={tree_data}
        setData={setDataAndSend}
        setLastOperation={setLastOperation}
      >
        <MileFrame
          data={data}
          frameRef={frameRef}
          channelRef={channelRef}
          iframeSrc={`${process.env.NEXT_PUBLIC_HOST_URL}/mile${path}/__iframe_content__`}
        />
      </EditorProvider>
      <Toaster />
    </>
  );
}

enum IframeActionType {
  SetHeight = "SetHeight",
  SetState = "SetState",
  SetWidthHeight = "SetWidthHeight",
  SetBreakpointDesktop = "SetBreakpointDesktop",
  SetBreakpointTablet = "SetBreakpointTablet",
  SetBreakpointMobile = "SetBreakpointMobile",
}

type IframeAction = {
  type: IframeActionType;
  payload?: any;
};

type IframeState = {
  w: string;
  h: string;
  pt: number;
  zoom: number;
  breakpoint: "desktop" | "tablet" | "mobile";
};

const initialIframeState: IframeState = {
  w: "100%",
  // h: "100vh",
  h: "auto",
  pt: HEADER_HEIGHT,
  zoom: 1,
  breakpoint: "desktop",
};

function iframeReducer(state: IframeState, action: IframeAction) {
  switch (action.type) {
    case IframeActionType.SetHeight: {
      return { ...state, h: action.payload };
    }
    case IframeActionType.SetState: {
      return action.payload;
    }
    case IframeActionType.SetWidthHeight: {
      return { ...state, w: action.payload.w, h: action.payload.h };
    }
    case IframeActionType.SetBreakpointDesktop: {
      return {
        ...state,
        breakpoint: "desktop",
        // w: action.payload.w,
        w: "100%",
      };
    }
    case IframeActionType.SetBreakpointTablet: {
      return { ...state, breakpoint: "tablet", w: action.payload.w };
    }
    case IframeActionType.SetBreakpointMobile: {
      return { ...state, breakpoint: "mobile", w: action.payload.w };
    }
  }
}

type IFrame = HTMLIFrameElement & {
  contentWindow: Window | null | undefined;
};

/**
 * App Reducer
 */
enum AppActionType {
  DeselectNode = "DeselectNode",
  SelectNode = "SelectNode",
  SelectMarkdownNode = "SelectMarkdownNode",
  OpenMarkdownEditor = "OpenMarkdownEditor",
  CloseMarkdownEditor = "CloseMarkdownEditor",
}
type AppAction = {
  type: AppActionType;
  payload?: any;
};
type AppState = {
  activeNodeId: string | null;
  isMarkdownEditorOpen: boolean;
};
const initialAppState: AppState = {
  activeNodeId: null,
  isMarkdownEditorOpen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case AppActionType.SelectNode: {
      return { ...state, activeNodeId: action.payload.id };
    }
    case AppActionType.SelectMarkdownNode: {
      return {
        ...state,
        activeNodeId: action.payload.id,
        isMarkdownEditorOpen: true,
      };
    }
    case AppActionType.DeselectNode: {
      return { ...state, activeNodeId: null, isMarkdownEditorOpen: false };
    }
    case AppActionType.OpenMarkdownEditor: {
      return { ...state, isMarkdownEditorOpen: true };
    }
    case AppActionType.CloseMarkdownEditor: {
      return { ...state, activeNodeId: null, isMarkdownEditorOpen: false };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

/**
 * Draft Data Reducer
 */

function draftDataReducer(
  state: DraftDataState,
  action: DraftDataAction,
): DraftDataState {
  switch (action.type) {
    case "UpdateField": {
      return { ...state, [action.payload.key]: action.payload.value };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

function MileFrame({
  data,
  iframeSrc,
  frameRef,
  channelRef,
}: {
  frameRef: React.RefObject<IFrame | null>;
  channelRef: React.RefObject<any | null>;
  data: TreeData | undefined;
  iframeSrc: string;
}) {
  const editor = useEditor();
  const mile = useMileProvider();
  const [iframe_state, dispatch_iframe] = useReducer(
    iframeReducer,
    initialIframeState,
  );
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const markdownEditorRef = useRef<{
    getDocument: () => any;
    getMarkdown: () => string;
  } | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      await channelRef.current?.receive((message: any) => {
        // setup receive handler
        if (message?.kind === "selectNode") {
          const schema = mile.schema.get(message.data.type);
          if (schema.isMarkdown) {
            dispatch({
              type: AppActionType.SelectMarkdownNode,
              payload: { id: message.data.id },
            });
          } else {
            dispatch({
              type: AppActionType.SelectNode,
              payload: { id: message.data.id },
            });
          }
        }

        if (message?.kind === "request_data") {
          channelRef.current?.send({
            kind: "update_data",
            data: data,
          });
        }
      });
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [frameRef, channelRef, editor, data, mile.schema]);

  // shortcut
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "$mod+S": (e: Event) => {
        e.preventDefault();
        editor.save();
      },
      "$mod+Z": (e: Event) => {
        e.preventDefault();
        editor.undo();
      },
      "$mod+Y": (e: Event) => {
        e.preventDefault();
        editor.redo();
      },
    });
    return () => {
      unsubscribe();
    };
  }, [editor]);

  // console.log("data", data);

  return (
    <div className="flex flex-col h-screen">
      <MileHeader
        frameRef={frameRef}
        iframe_state={iframe_state}
        dispatch_iframe={dispatch_iframe}
      />
      <MileContent
        data={data}
        iframeSrc={iframeSrc}
        frameRef={frameRef}
        iframe_state={iframe_state}
        dispatch_iframe={dispatch_iframe}
        state={state}
        dispatch={dispatch}
      />
      <DialogRoot
        open={state.isMarkdownEditorOpen}
        onOpenChange={(v) => {
          if (v) {
            dispatch({ type: AppActionType.OpenMarkdownEditor });
          } else {
            dispatch({ type: AppActionType.CloseMarkdownEditor });
          }
        }}
        dismissible={false}
      >
        <DialogContent className="px-6 py-4 fixed bottom-0 top-1/2 left-1/2 h-[calc(100vh-180px)] w-full max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <div className="mb-4 flex flex-row justify-between items-center">
            <Dialog.Title className="text-lg font-medium">Edit</Dialog.Title>
            <div className="flex flex-row items-center gap-x-2">
              <Button
                onClick={() => dispatch({ type: AppActionType.DeselectNode })}
                className="px-3 py-1 rounded text-sm"
                variant="secondary"
                size="sm"
              >
                Discard
              </Button>
              <Button
                onClick={() => {
                  // const md = markdownEditorRef.current?.getMarkdown();
                  const doc = markdownEditorRef.current?.getDocument();
                  console.log("doc", doc);
                  if (state.activeNodeId && doc) {
                    const tree = convertBlocksToNodeData(doc);
                    editor.perform({
                      type: "mergeTreeData",
                      name: `Merge tree data`,
                      payload: { node_id: state.activeNodeId, content: tree },
                    });
                  }
                  dispatch({ type: AppActionType.DeselectNode });
                }}
                className="px-3 py-1 rounded text-sm"
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto h-full pb-20 z-10">
            {Boolean(state.activeNodeId) && state.isMarkdownEditorOpen && (
              <OverlayTextEditor
                key={state.activeNodeId}
                ref={markdownEditorRef}
                activeNodeId={state.activeNodeId}
                initialContent={buildInitialContentForActiveNode(
                  state.activeNodeId,
                  data,
                  mile.schema,
                )}
                close={() => {
                  dispatch({ type: AppActionType.CloseMarkdownEditor });
                }}
              />
            )}
          </div>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function buildInitialContentForActiveNode(
  node_id: string | null,
  data: TreeData | undefined,
  schema: MileSchema,
) {
  const node = node_id && data ? data[node_id] : null;
  console.log("buildTextEditorInitialContentForSingleNode node", node, data);
  if (!node || !data) return [];

  // this should handle built-in node type from blocknote
  // types: paragraph | heading | quote | bulletListItem | numberedListItem | checkListItem |
  // image | file | video | audio | table | codeBlock
  const initialContent = convertNodeDataToBlocks(node, data);
  console.log("initialContent", initialContent);
  return initialContent;
}

function OverlayTextEditor({
  activeNodeId,
  initialContent,
  ref,
  close,
}: {
  activeNodeId: string | null;
  initialContent: any;
  ref: React.RefObject<{
    getDocument: () => any;
    getMarkdown: () => string;
  } | null>;
  close: () => void;
}) {
  const { control, upload } = useMileUploadFile();
  const editor = useCreateBlockNote({
    schema: bn_schema,
    initialContent,
    uploadFile: makeUploadFile(upload),
  });

  useImperativeHandle(ref, () => {
    return {
      getDocument() {
        // NOTE: not used
        return editor.document;
      },
      getMarkdown() {
        return editor.blocksToMarkdownLossy();
      },
    };
  }, [editor]);

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) => {
      return filterSuggestionItems(getCustomSlashMenuItems(editor), query);
    };
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      slashMenu={false}
      filePanel={false}
      theme="light"
    >
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={getSlashMenuItems}
      />
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key={"blockTypeSelect"} />
            <FileCaptionButton key={"fileCaptionButton"} />
            <FileReplaceButton key={"replaceFileButton"} />
            <BasicTextStyleButton
              basicTextStyle={"bold"}
              key={"boldStyleButton"}
            />
            <BasicTextStyleButton
              basicTextStyle={"italic"}
              key={"italicStyleButton"}
            />
            <BasicTextStyleButton
              basicTextStyle={"underline"}
              key={"underlineStyleButton"}
            />
            <BasicTextStyleButton
              basicTextStyle={"strike"}
              key={"strikeStyleButton"}
            />
            {/*<TextAlignButton
              textAlignment={"left"}
              key={"textAlignLeftButton"}
            />
            <TextAlignButton
              textAlignment={"center"}
              key={"textAlignCenterButton"}
            />
            <TextAlignButton
              textAlignment={"right"}
              key={"textAlignRightButton"}
            />
            <ColorStyleButton key={"colorStyleButton"} />*/}
            <NestBlockButton key={"nestBlockButton"} />
            <UnnestBlockButton key={"unnestBlockButton"} />
            <CreateLinkButton key={"createLinkButton"} />
          </FormattingToolbar>
        )}
      />
      <FilePanelController filePanel={UploadFilePanel} />
    </BlockNoteView>
  );
}

function MileContent({
  iframeSrc,
  frameRef,
  iframe_state,
  dispatch_iframe,
  data,
  state,
  dispatch,
}: {
  iframeSrc: string;
  frameRef: React.RefObject<IFrame | null>;
  iframe_state: IframeState;
  dispatch_iframe: React.ActionDispatch<[action: IframeAction]>;
  data: TreeData | undefined;
  state: AppState;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  const { zoom, pt, w, h } = iframe_state;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const iframeBodyHeight = window.innerHeight - HEADER_HEIGHT;
    dispatch_iframe({
      type: IframeActionType.SetWidthHeight,
      payload: { w: `100%`, h: `${iframeBodyHeight}px` },
    });
  }, []);

  useEffect(() => {
    function handleResize() {
      const iframeBodyHeight = window.innerHeight - HEADER_HEIGHT;
      dispatch_iframe({
        type: IframeActionType.SetWidthHeight,
        payload: { w: `100%`, h: `${iframeBodyHeight}px` },
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // workaround for drag and drop autoscrolling
  // normally we maintain iframe height to be real height at all time (with zoom applied)
  // this means the page is as long as iframe content. so when we scroll the page, the body is the one scrolling.
  // however, the auto scroll in drag and drop code does the scrolling on iframe window.
  // so the iframe element needs to be shorter than the iframe content height.
  // - on drag start
  //   - temporarily sets iframe height to the viewport height on drag started so that auto scrolling works properly.
  //   - swap scrollTop value from body to the iframe root node
  // - on drag end
  //   - sets iframe height back to real iframe height.
  //   - swap scrollTop value back
  //
  // NOTE: the drawback of this workaround is that the scrollbar will appear
  // inside iframe during drag when zoomed because we temporarily set iframe height
  // to the viewport height and iframe root node is the one scrolling.
  // this is okay since mouse needs to be inside iframe during drag anyway.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== NEXT_PUBLIC_HOST_URL) {
        // Ignore messages from other origins
        return;
      }
      let { type, payload } = event.data;
      if (type === "drag-started") {
        const viewportHeight = window.innerHeight / zoom;
        const scrollPosition = document.body.scrollTop / zoom;
        flushSync(() => {
          dispatch_iframe({
            type: IframeActionType.SetHeight,
            payload: `${viewportHeight}px`,
          });
        });
        if (frameRef.current?.contentDocument) {
          frameRef.current.contentDocument.documentElement.scrollTop =
            scrollPosition;
        }
        return;
      }
      if (type === "drag-ended") {
        const scrollPosition =
          frameRef.current?.contentDocument?.documentElement.scrollTop;
        invariant(scrollPosition != null);
        const iframeBodyHeight = getIframeBodyHeight(frameRef.current, zoom);
        flushSync(() => {
          dispatch_iframe({
            type: IframeActionType.SetHeight,
            payload: `${iframeBodyHeight}px`,
          });
        });
        document.body.scrollTop = scrollPosition * zoom;
        return;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [frameRef, zoom, dispatch_iframe]);

  function toggleSidebar() {
    setIsOpen((s) => !s);
  }

  // const handlePanelResize = (size: number, prevSize: number | undefined) => {
  //   setPanelSize(size);
  // };

  // return (
  //   <div
  //     className="flex grow h-(--h) mt-[40px]"
  //     style={{ ["--h" as string]: `${h}` }}
  //   >
  //     <div
  //       direction="horizontal"
  //       autoSaveId="mile-editor"
  //       className="relative flex items-start w-full h-full"
  //     >
  //       <div id="iframe" order={1} minSize={30} className="w-full h-full grow">
  //         <div className="artboard-inner h-full overflow-y-auto">
  //           <div className="">
  //             <div className="mile-canvas-root">
  //               <iframe
  //                 ref={frameRef}
  //                 id="mileframe"
  //                 src={iframeSrc}
  //                 title="mileframe"
  //                 className="mile-iframe"
  //                 style={{ width: w, height: h, margin: "0 auto" }}
  //               />
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //       <div className="w-[2px] bg-blue-200 hover:bg-blue-400" />
  //       {isOpen && (
  //         <div
  //           id="sidebar"
  //           order={2}
  //           defaultSize={20}
  //           minSize={15}
  //           maxSize={65}
  //           className="bg-slate-100 w-[300px] h-full"
  //         >
  //           <div className="h-full overflow-y-auto">
  //             <Layers data={data} state={state} dispatch={dispatch} />
  //             {/*<NodeInspector data={data} />*/}
  //           </div>
  //         </div>
  //       )}
  //       <div className="absolute right-1 top-1">
  //         <button
  //           className="size-5 rounded-md border border-slate-400 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center"
  //           onClick={() => toggleSidebar()}
  //         >
  //           {isOpen ? (
  //             <ChevronRight color="black" size={14} />
  //           ) : (
  //             <ChevronLeft color="black" size={14} />
  //           )}
  //         </button>
  //       </div>
  //     </div>
  //     <div className="mile-controls">
  //       <div className="mile-controls-right">
  //         <div className="">tool 4</div>
  //         <div className="">tool 5</div>
  //         <div className="">tool 6</div>
  //       </div>
  //     </div>
  //   </div>
  // );

  // FIX: "react-resizable-panels" bug
  // Iframe stops scrolling after resizing via handle
  // https://github.com/bvaughn/react-resizable-panels/issues/419

  return (
    <div
      className="flex grow h-(--h) mt-[40px]"
      style={{ ["--h" as string]: `${h}` }}
    >
      <PanelGroup
        direction="horizontal"
        autoSaveId="mile-editor"
        className="relative h-full"
      >
        <Panel id="iframe" order={1} minSize={30}>
          <div className="artboard-inner h-full overflow-y-auto min-h-0">
            <iframe
              ref={frameRef}
              id="mileframe"
              src={iframeSrc}
              title="mileframe"
              className="mile-iframe"
              style={{ width: w, height: h, margin: "0 auto" }}
            />
          </div>
        </Panel>
        <PanelResizeHandle className="w-[2px] bg-blue-200 hover:bg-blue-400" />
        {isOpen && (
          <Panel
            id="sidebar"
            order={2}
            defaultSize={20}
            minSize={15}
            maxSize={65}
            className="bg-slate-100 h-full"
          >
            <div className="h-full overflow-y-auto">
              <Layers data={data} state={state} dispatch={dispatch} />
              {/*<NodeInspector data={data} />*/}
            </div>
          </Panel>
        )}
        <div className="absolute right-1 top-1">
          <button
            className="size-5 rounded-md border border-slate-400 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center"
            onClick={() => toggleSidebar()}
          >
            {isOpen ? (
              <ChevronRight color="black" size={14} />
            ) : (
              <ChevronLeft color="black" size={14} />
            )}
          </button>
        </div>
      </PanelGroup>
      <div className="mile-controls">
        <div className="mile-controls-right">
          <div className="">tool 4</div>
          <div className="">tool 5</div>
          <div className="">tool 6</div>
        </div>
      </div>
    </div>
  );
}

function useMileUploadFile() {
  return useUploadFile({
    route: "mileupload",
    api: "/api/mile/upload",
    onUploadComplete: async (upload) => {
      toast.success(`Uploaded ${upload.file.name}`);
    },
    onUploadBegin: async ({ file }) => {
      toast.info(`Uploading ${file.name}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

const primitiveTypes = [
  "array",
  "string",
  "number",
  "boolean",
  "url",
  "image_url",
  "date",
  "richtext",
  "heading",
];

function isPrimitiveType(type: string) {
  return primitiveTypes.includes(type);
}

function getPrimitiveComponent(type: string) {
  switch (type) {
    case "array":
      return EditArrayComponent;
    case "string":
      return EditStringComponent;
    case "number":
      return EditNumberComponent;
    case "boolean":
      return EditBooleanComponent;
    case "url":
      return EditUrlComponent;
    case "image_url":
      return EditImageUrlComponent;
    case "date":
      return EditDateComponent;
    case "richtext":
      return EditRichtextComponent;
    case "heading":
      return EditHeadingComponent;
    default:
      throw new Error(`Unsupported primitive component: ${type}`);
  }
}

const insertHelloWorldItem = (editor: typeof bn_schema.BlockNoteEditor) => ({
  title: "Insert Hello World",
  onItemClick: () =>
    // If the block containing the text caret is empty, `insertOrUpdateBlock`
    // changes its type to the provided block. Otherwise, it inserts the new
    // block below and moves the text caret to it. We use this function with
    // a block containing 'Hello World' in bold.
    insertOrUpdateBlock(editor, {
      type: "paragraph",
      content: [{ type: "text", text: "Hello World", styles: { bold: true } }],
    }),
  aliases: ["helloworld", "hw"],
  group: "Other",
  icon: <TabletIcon size={18} />,
  subtext: "Used to insert a block with 'Hello World' below.",
});

const getCustomSlashMenuItems = (
  editor: typeof bn_schema.BlockNoteEditor,
): DefaultReactSuggestionItem[] => {
  const d = getDefaultReactSlashMenuItems(editor);
  console.log("d", d);

  const defaults = getDefaultReactSlashMenuItems(editor).filter(
    (e) =>
      !(
        e.title.toLowerCase().startsWith("toggle heading") ||
        e.title.toLowerCase() === "toggle list" ||
        e.title.toLowerCase() === "check list" ||
        e.title.toLowerCase() === "code block" ||
        e.title.toLowerCase() === "image" ||
        e.title.toLowerCase() === "video" ||
        e.title.toLowerCase() === "audio" ||
        e.title.toLowerCase() === "file"
      ),
  );

  return [...defaults, insertHelloWorldItem(editor)];
};

const bn_schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    image: {
      ...defaultBlockSpecs.image,
      config: {
        ...defaultBlockSpecs.image.config,
        propSchema: {
          ...defaultBlockSpecs.image.config.propSchema,
          previewWidth: {
            ...defaultBlockSpecs.image.config.propSchema.previewWidth,
            default: 512 as const,
          },
        },
      },
    },
  },
});
// const bn_schema = BlockNoteSchema.create({
//   blockSpecs: {
//     // audio: defaultBlockSpecs.audio,
//     bulletListItem: defaultBlockSpecs.bulletListItem,
//     checkListItem: defaultBlockSpecs.checkListItem,
//     // codeBlock: defaultBlockSpecs.codeBlock,
//     divider: defaultBlockSpecs.divider,
//     file: defaultBlockSpecs.file,
//     heading: defaultBlockSpecs.heading,
//     image: defaultBlockSpecs.image,
//     numberedListItem: defaultBlockSpecs.numberedListItem,
//     paragraph: defaultBlockSpecs.paragraph,
//     quote: defaultBlockSpecs.quote,
//     table: defaultBlockSpecs.table,
//     // toggleListItem: defaultBlockSpecs.toggleListItem,
//     video: defaultBlockSpecs.video,
//   },
//   inlineContentSpecs: defaultInlineContentSpecs,
//   styleSpecs: defaultStyleSpecs,
// });

type EditComponentProps = {
  editor: MileEditor;
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  field: FieldDefinition;
};

function EditRichtextComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path);
  console.log("value", value);

  const { control, upload } = useMileUploadFile();

  const bn_editor = useCreateBlockNote({
    initialContent:
      value.length === 0
        ? [
            {
              type: "paragraph",
              content: "",
            },
          ]
        : value,
    schema: bn_schema,
    uploadFile: makeUploadFile(upload),
  });

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) => {
      return filterSuggestionItems(getCustomSlashMenuItems(bn_editor), query);
    };
  }, [bn_editor]);

  function handleEditorChange(editor: typeof bn_schema.BlockNoteEditor) {
    const content = editor.document;
    handleChange({ path, value: content });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <BlockNoteView
        editor={bn_editor}
        onChange={handleEditorChange}
        formattingToolbar={false}
        slashMenu={false}
        theme="light"
        data-theming-sidebar
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={getSlashMenuItems}
        />
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <BlockTypeSelect key={"blockTypeSelect"} />
              <FileCaptionButton key={"fileCaptionButton"} />
              <FileReplaceButton key={"replaceFileButton"} />
              <BasicTextStyleButton
                basicTextStyle={"bold"}
                key={"boldStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"italic"}
                key={"italicStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"underline"}
                key={"underlineStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"strike"}
                key={"strikeStyleButton"}
              />
              <TextAlignButton
                textAlignment={"left"}
                key={"textAlignLeftButton"}
              />
              <TextAlignButton
                textAlignment={"center"}
                key={"textAlignCenterButton"}
              />
              <TextAlignButton
                textAlignment={"right"}
                key={"textAlignRightButton"}
              />
              <ColorStyleButton key={"colorStyleButton"} />
              <NestBlockButton key={"nestBlockButton"} />
              <UnnestBlockButton key={"unnestBlockButton"} />
              <CreateLinkButton key={"createLinkButton"} />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>
    </div>
  );
}

function EditDateComponent({ editor, node, field }: EditComponentProps) {
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <input type="date" />
    </div>
  );
}

function EditUrlComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path);

  function handleInputChange(e: any) {
    const nextValue = e.target.value;
    startTransition(() => {
      handleChange({ path, value: nextValue });
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input
        type="text"
        className="border"
        value={value}
        onChange={handleInputChange}
        disabled={editor.is_disabled}
      />
    </div>
  );
}

function getAltTextPath(path: string[]): string[] {
  if (
    path.length >= 2 &&
    // remove this check because some array path won't have "image" in path but a numberic index instead
    // path[path.length - 2] === "image" &&
    path[path.length - 1] === "image_url"
  ) {
    return [...path.slice(0, -1), "alt_text"];
  }

  return [];
}

function EditImageUrlComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const [selectedFileId, setSelectedFileId] = useState("");
  const [open, setOpen] = useState(false);

  // path can be ["image", "image_url"] or ["images",0,"image_url"] (in this case, image is implicitly inferred from 0, which is images' item type)
  const value = getFieldValue(state, path);
  // console.log("image url node", node, path, state, field, value);

  function handleConfirmFile(file_id: string, data: any) {
    setSelectedFileId(file_id);
    if (!data) {
      toast.error(
        `Selecting file failed. Please choose different file. Or refresh the page and try agian.`,
      );
      return;
    }
    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${data.filepath}`;
    const path_alt_text = getAltTextPath(path);
    handleChange([
      { path, value: image_url },
      { path: path_alt_text, value: data.alt ?? "" }, // empty string in case data is null
    ]);
    setOpen(false);
  }

  function handleUploadSuccess(upload: any) {
    /** upload
     * file: {
        "status": "complete",
        "progress": 1,
        "raw": {},
        "name": "2024-Drive-The-Icons-Monterey-Car-Week-tour-13.jpg",
        "size": 114176,
        "type": "image/jpeg",
        "objectInfo": {
            "key": "mileupload/2024-drive-the-icons-monterey-car-week-tour-1.jpg",
            "metadata": {}
        },
        "objectMetadata": {}
      },
      metadata: {}
     */
    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${upload.file.objectInfo.key}`;
    const path_alt_text = getAltTextPath(path);
    handleChange([
      { path, value: image_url },
      { path: path_alt_text, value: "" }, // empty alt for newly upload file
    ]);

    // save db
    mutate(`/medias`, async (prev: any) => {
      const res = await saveImagesToDB([
        {
          id: generateId(),
          type: upload.file.type,
          size: upload.file.size,
          filepath: upload.file.objectInfo.key,
          width: upload.file.width,
          height: upload.file.height,
        },
      ]);
      return prev ? [...prev, ...res] : res;
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      {value ? (
        <div className="max-w-[150px]">
          <img src={value} alt="" />
        </div>
      ) : null}
      <div className="flex items-center gap-x-2">
        <Uploader
          is_disabled={editor.is_disabled}
          onSuccess={handleUploadSuccess}
          label={value ? "Change image" : "Upload image"}
        />
        <ImageGalleryDialog
          key={selectedFileId}
          is_disabled={editor.is_disabled}
          open={open}
          setOpen={setOpen}
          handleConfirmFile={handleConfirmFile}
          initialSelectedFileId={selectedFileId}
        />
      </div>
    </div>
  );
}

function EditArrayComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const mile = useMileProvider();
  const [open, setOpen] = useState(false);
  const [add_path, setAddPath] = useState<string[] | null>(null);

  const value = getFieldValue(state, path);
  console.log("(node)", node, path, state, field, value);

  const schema = mile.schema;
  // support only one type of item type
  // @ts-expect-error okk
  const item_field = field.of[0];
  const item_schema = schema.get(item_field.type);

  function handleAddClick() {
    console.log("--- click add", path, state);
    // console.log("schema", item_schema);
    // console.log("node", node, path, state, field, value);
    const [item_key, ...ignore] = path; // e.g. ["images"]
    const thisstate = state[item_key]; // pick array from node state

    const initializeState = createInitialValue(null, item_schema, schema);
    console.log("initializeState", initializeState);

    const new_item_path = path.concat([thisstate.length]);
    setOpen(true);
    setAddPath(new_item_path);
    handleChange({
      op: "add",
      value: initializeState,
      path: new_item_path,
    });
  }

  function handleReorderItems(new_items: any) {
    console.log("--- handleReorderItems", path, state, new_items);
    handleChange({
      value: new_items,
      path: path,
    });
  }

  function isItemEmptyState(item: any) {
    const initializeState = createInitialValue(null, item_schema, schema);
    return deepEqual(item, initializeState);
  }

  function close(v: boolean) {
    setOpen(v);
    // handle dangling initial state item in array
    const containsEmptyState = value.some((item: any) =>
      isItemEmptyState(item),
    );
    if (containsEmptyState) {
      // undo the "add" that exits prematurely and cause dangling initial state item in array
      handleChange({
        value: value.filter((e: any) => !isItemEmptyState(e)),
        path: path,
      });
    }
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      {value.length > 0 && (
        <ArrayItems
          handleReorderItems={handleReorderItems}
          items={value}
          schema={field}
          item_schema={item_schema}
        />
      )}
      <Button onClick={handleAddClick}>Add</Button>
      <DialogRoot open={open} onOpenChange={close} dismissible={false}>
        <DialogContent className="px-6 py-4 fixed bottom-0 top-1/2 left-1/2 h-[calc(100vh-180px)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <div className="mb-4 flex flex-row justify-between items-center">
            <Dialog.Title className="text-lg font-medium">Add</Dialog.Title>
            <div className="flex flex-row items-center gap-x-2">
              <Button
                // onClick={() => dispatch({ type: AppActionType.DeselectNode })}
                onClick={() => {
                  close(false);
                }}
                className="px-3 py-1 rounded text-sm"
                variant="secondary"
                size="sm"
              >
                Discard
              </Button>
              <Button
                onClick={() => {
                  close(false);
                }}
                className="px-3 py-1 rounded text-sm"
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto h-full pb-20 z-10 space-y-3">
            <EditField
              node={node}
              path={add_path ?? []}
              state={state}
              handleChange={handleChange}
              parent={field}
              field={item_field}
            />
          </div>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function ArrayItems({
  items,
  schema,
  item_schema,
  handleReorderItems,
}: {
  items: any[];
  schema: SchemaTypeDefinition | FieldDefinition;
  item_schema: SchemaTypeDefinition | FieldDefinition;
  handleReorderItems: (new_items: any[]) => void;
}) {
  console.log("schema", schema);
  console.log("items schema", item_schema);
  const { options } = schema;
  console.log("options", options);
  // support "list" layout only for now
  // @ts-expect-error okk
  const layout = options?.layout || "list";

  if (layout === "list") {
    return (
      <ArrayItemsList
        handleReorderItems={handleReorderItems}
        items={items}
        schema={schema}
        item_schema={item_schema}
      />
    );
  }

  throw new Error(`Unsupported layout: ${layout}`);
}

function ArrayItemsList({
  items,
  schema,
  item_schema,
  handleReorderItems,
}: {
  items: any[];
  schema: SchemaTypeDefinition | FieldDefinition;
  item_schema: SchemaTypeDefinition | FieldDefinition;
  handleReorderItems: (new_items: any[]) => void;
}) {
  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return !!source.data;
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target || !source.data || !target.data || !items) {
          return;
        }

        const indexOfTarget = items.findIndex(
          (item) => item.image_url === (target.data.item as any).image_url,
        );
        if (indexOfTarget < 0) {
          return;
        }
        const closestEdgeOfTarget = extractClosestEdge(target.data);
        const startIndex = source.data.index as number;
        const finishIndex = getReorderDestinationIndex({
          startIndex,
          closestEdgeOfTarget,
          indexOfTarget,
          axis: "vertical",
        });
        console.log("drop", {
          items,
          source: source.data,
          target: target.data,
          closestEdgeOfTarget,
          startIndex,
          finishIndex,
          indexOfTarget,
        });
        if (finishIndex === startIndex) {
          // If there would be no change, we skip the update
          return;
        }
        const new_items = reorder({
          list: items,
          startIndex,
          finishIndex,
        });
        handleReorderItems(new_items);
      },
    });
  }, [items]);

  return (
    <div className="bg-slate-200 px-3 py-1.5 flex flex-col gap-y-1.5">
      {items?.map((e, index) => {
        return (
          <ArrayItemListItem
            key={index}
            item_schema={item_schema}
            index={index}
            item={e}
          />
        );
      })}
    </div>
  );
}

function getReorderDestinationIndex({
  startIndex,
  closestEdgeOfTarget,
  indexOfTarget,
  axis,
}: {
  startIndex: number;
  closestEdgeOfTarget: Edge | null;
  indexOfTarget: number;
  axis: "vertical" | "horizontal";
}): number {
  // invalid index's
  if (startIndex === -1 || indexOfTarget === -1) {
    return startIndex;
  }

  // if we are targeting the same index we don't need to do anything
  if (startIndex === indexOfTarget) {
    return startIndex;
  }

  if (closestEdgeOfTarget == null) {
    return indexOfTarget;
  }

  const isGoingAfter: boolean =
    (axis === "vertical" && closestEdgeOfTarget === "bottom") ||
    (axis === "horizontal" && closestEdgeOfTarget === "right");

  const isMovingForward: boolean = startIndex < indexOfTarget;
  // moving forward
  if (isMovingForward) {
    return isGoingAfter ? indexOfTarget : indexOfTarget - 1;
  }
  // moving backwards
  return isGoingAfter ? indexOfTarget + 1 : indexOfTarget;
}

function reorder<Value>({
  list,
  startIndex,
  finishIndex,
}: {
  list: Value[];
  startIndex: number;
  finishIndex: number;
}): Value[] {
  if (startIndex === -1 || finishIndex === -1) {
    // Making this function consistently return a new array reference.
    // This is consistent with .toSorted() which always returns a new array
    // even when it does not do anything
    return Array.from(list);
  }

  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(finishIndex, 0, removed);

  return result;
}

function ArrayItemListItem({
  index,
  item,
  item_schema,
}: {
  index: number;
  item: any;
  item_schema: SchemaTypeDefinition | FieldDefinition;
}) {
  console.log("item", item, index);

  const ref = useRef<HTMLDivElement>(null);
  const [draggableState, setDraggableState] =
    useState<DraggableState>(idleState);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = ref.current;
    // const dragHandle = dragHandleRef.current;
    invariant(element);
    // invariant(dragHandle);

    const dragData = {
      item,
      index,
    };

    function onChange({ source, self }: ElementDropTargetEventBasePayload) {
      const isSource = source.element === element;
      if (isSource) {
        setClosestEdge(null);
        return;
      }

      const closestEdge = extractClosestEdge(self.data);

      const sourceIndex = source.data.index;
      invariant(typeof sourceIndex === "number");

      const isItemBeforeSource = index === sourceIndex - 1;
      const isItemAfterSource = index === sourceIndex + 1;

      const isDropIndicatorHidden =
        (isItemBeforeSource && closestEdge === "bottom") ||
        (isItemAfterSource && closestEdge === "top");

      if (isDropIndicatorHidden) {
        setClosestEdge(null);
        return;
      }

      setClosestEdge(closestEdge);
    }

    return combine(
      // registerItem({ itemId: item.id, element }),
      draggable({
        element,
        getInitialData: () => dragData,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            // getOffset: () => ({ x: 18, y: 18 }),
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "8px",
            }),
            render({ container }) {
              setDraggableState({ type: "preview", container });
              return () => setDraggableState(draggingState);
            },
          });
        },
        onDragStart() {
          setDraggableState(draggingState);
        },
        onDrop() {
          setDraggableState(idleState);
        },
      }),
      dropTargetForElements({
        element,
        // canDrop({ source }) {
        //   return source.data.instanceId === instanceId;
        // },
        getData({ input }) {
          return attachClosestEdge(dragData, {
            element,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter: onChange,
        onDrag: onChange,
        onDragLeave() {
          setClosestEdge(null);
        },
        onDrop() {
          setClosestEdge(null);
        },
      }),
    );
  }, [index, item]);

  const preview = getPreview(item_schema, item);
  console.log("preview", preview);

  return (
    <>
      <div ref={ref} className="relative flex gap-x-2">
        {preview.media && (
          <div className="w-16 h-16">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.alt_text}
                className="object-cover w-full h-full"
                draggable={false}
              />
            )}
          </div>
        )}
        <div className="grow">
          <div className="text-sm">{preview.title}</div>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </div>
      {draggableState.type === "preview" &&
        ReactDOM.createPortal(
          <div
            style={{
              /**
               * Ensuring the preview has the same dimensions as the original.
               *
               * Using `border-box` sizing here is not necessary in this
               * specific example, but it is safer to include generally.
               */
              boxSizing: "border-box",
              position: "relative",
              // width: state.rect.width,
              // height: state.rect.height,
              // width: 36,
              height: 36,
            }}
          >
            {/*<DragPreview />*/}
            <div className="px-3 py-1.5 bg-white shadow-lg">image</div>
          </div>,
          draggableState.container,
        )}
    </>
  );
}

function getPreview(item_schema: any, item: any) {
  const preview = item_schema.preview;
  if (!preview || !preview.select) {
    throw new Error(`Missing preview for item type: ${item_schema.type}`);
  }
  const select = {};
  for (const key in preview.select) {
    if (preview.select.hasOwnProperty(key)) {
      const pick = preview.select[key];
      // @ts-expect-error okk
      select[key] = item[pick];
    }
  }
  const ret = {};
  if (preview.prepare) {
    const prepared = preview.prepare(select);
    return prepared;
  }
  return ret;
}

function EditBooleanComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path);
  const [local, setLocal] = useState(value);

  function handleInputChange(checked: boolean | "indeterminate") {
    setLocal(checked);
    startTransition(() => {
      handleChange({ path, value: checked });
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold flex items-center gap-x-2">
        <Checkbox.Root
          checked={local}
          onCheckedChange={handleInputChange}
          className="flex size-5 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
        >
          <Checkbox.Indicator className="flex text-gray-50 data-[unchecked]:hidden">
            <CheckIcon className="size-3" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {field.title}
      </label>
    </div>
  );
}

function EditNumberComponent({ editor, node, field }: EditComponentProps) {
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input type="text" />
    </div>
  );
}

/**
 * path can be ["image", "image_url"] or ["images",0,"image_url"]
 * in this case, image is implicitly inferred from 0, which is images' item type
 *
 * {
    "images": [
      {"image_url": "", "alt_text": ""}
    ],
    "mode": ""
 }
 */
function getFieldValue(state: any, path: string[]) {
  // console.log("getFieldValue", state, path);
  if (path.length === 0) {
    return state;
  }
  if (state == null) {
    return state;
  }
  const [first, ...rest] = path;
  // invariant(first);
  if (typeof first === "string") {
    // edge case: this child state can be empty array when editor clicks "add" new item of array
    // state (e.g. "images") will transition from initial empty array [] to an initialized state of array item [{initialized item state}]
    // therefore, field component first renders with [], then [{initialized item state}]
    // this edge case is that first render.
    const child_state = state[first];
    if (child_state) {
      return getFieldValue(child_state, rest);
    }
  } else if (typeof first === "number") {
    if (Array.isArray(state)) {
      // if state is empty array, child_state will be undefined
      // this will cause the calling component to render with undefined
      // and may cause react warning of uncontrolled to controlled input component
      // we solve this in calling component (e.g. EditStringComponent) by prevent undefined value
      const child_state = state[first];
      if (child_state) {
        return getFieldValue(child_state, rest);
      }
    }
  }
  return getFieldValue(state[first], rest);
}

function EditStringComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path) ?? "";
  console.log("---string", state, path, value);

  function handleInputChange(e: any) {
    const nextValue = e.target.value;
    startTransition(() => {
      handleChange({ path, value: nextValue });
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input
        type="text"
        className="border"
        value={value}
        onChange={handleInputChange}
        disabled={editor.is_disabled}
      />
    </div>
  );
}

function EditHeadingComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path);
  console.log("value", value);

  function handleInputChange(e: any) {
    const nextValue = e.target.value;
    startTransition(() => {
      handleChange({ path, value: nextValue });
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input
        type="text"
        className="border"
        value={value}
        onChange={handleInputChange}
        disabled={editor.is_disabled}
      />
    </div>
  );
}

/*************************************************************
 * Start: Edit Component Update State
 */
function createInitialValue(current: unknown, field: any, schema: MileSchema) {
  if (current) {
    return current;
  }
  return createInitialEmptyValue(field, schema);
}

function getDefaultValueForType(type: string): any {
  // "string", "number", "boolean", "url", "date", "richtext"
  switch (type) {
    case "array":
      return [];
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "object":
      return {};
    case "url":
      return "";
    case "image_url":
      return "";
    case "richtext":
      return [];
    case "date":
      return new Date();
    default:
      return null;
  }
}

function initializeFields(
  fields: any,
  schema: MileSchema,
): Record<string, any> {
  // console.log('initializeFields', fields, schema);
  return fields.reduce(
    (acc: Record<string, any>, field: any) => {
      // console.log("field.type", field.type);
      const isPrimitive = isPrimitiveType(field.type);
      if (isPrimitive) {
        acc[field.name] = getDefaultValueForType(field.type);
      } else {
        const f = schema.get(field.type);
        acc[field.name] = initializeFields(f.fields, schema);
      }
      return acc;
    },
    {} as Record<string, any>,
  );
}

function createInitialEmptyValue(field: any, schema: MileSchema) {
  const initialFields = field.fields
    ? initializeFields(field.fields, schema)
    : getDefaultValueForType(field.type);
  if (field.isResponsive) {
    return {
      mobile: { ...initialFields },
      tablet: { ...initialFields },
      desktop: { ...initialFields },
    };
  }
  return initialFields;
}

function updateState(
  state: unknown,
  change: Change,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
  schema: MileSchema,
) {
  if (state == null) {
    const initializeState = createInitialValue(state, field, schema);
    // console.log("field", field, initializeState);
    return updateNestedState(initializeState, change, field, breakpoint);
  }
  return updateNestedState(state, change, field, breakpoint);
}

function updateNestedState(
  state: any,
  change: Change,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
): any {
  if (field.isResponsive) {
    return {
      ...state,
      [breakpoint]: updateNestedStateRec(
        state[breakpoint],
        change,
        field,
        breakpoint,
      ),
    };
  }
  return updateNestedStateRec(state, change, field, breakpoint);
}

function updateNestedStateRec(
  state: any,
  change: Change,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
): any {
  console.log("updateState ----", state, change, field);
  /**
   *
   * {
       "path": ["images", 0, "alt_text"],
       "value": "o"
   }

   * {
       "images": [
         {"image_url": "", "alt_text": ""}
       ],
       "mode": ""
   }
   */

  // default op is to "set" passed value for passed path
  const op = change.op ?? "set";

  if (op === "set") {
    if (change.path.length === 0) {
      return change.value;
    }
    invariant(
      typeof state !== "string" &&
        typeof state !== "number" &&
        typeof state !== "boolean",
    );
    const [key, ...restPath] = change.path;
    invariant(key != null);
    const key_schema = field.fields.find((e: any) => e.name === key);
    if (key_schema?.type === "array") {
      console.log("-------- set array", change.path, state);

      const nextPathHead = restPath[0];
      const isNumericIndex =
        nextPathHead !== undefined && !isNaN(Number(nextPathHead));
      if (isNumericIndex) {
        const index = Number(nextPathHead);
        const existingArr = Array.isArray(state[key]) ? state[key] : [];
        // Recurse into the specific array element
        const newChange = {
          value: change.value,
          path: restPath.slice(1), // skip index
        };

        const updatedValue = updateNestedStateRec(
          existingArr[index],
          newChange,
          field,
          breakpoint,
        );

        // immutable array update
        const newArr = [...existingArr];
        newArr[index] = updatedValue;
        // const newArr = [
        //   ...existingArr.slice(0, index),
        //   updatedValue,
        //   ...existingArr.slice(index),
        // ];
        console.log("-------", key, newArr);

        return {
          ...state,
          [key]: newArr,
        };
      } else {
        // set the array value itself, not the item
        const newChange = {
          value: change.value,
          path: restPath,
        };
        return {
          ...state,
          [key]: updateNestedStateRec(state[key], newChange, field, breakpoint),
        };
      }
    } else {
      const newChange = {
        value: change.value,
        path: restPath,
      };
      return {
        ...state,
        [key]: updateNestedStateRec(state[key], newChange, field, breakpoint),
      };
    }
  }

  if (op === "add") {
    // TODO: when adding a new item to an array, ensure the index is correct
    // console.log("add ----", state, change, field);
    invariant(
      typeof state !== "string" &&
        typeof state !== "number" &&
        typeof state !== "boolean",
    );
    const index = change.path.at(-1);
    const key = change.path.at(-2);
    invariant(index !== undefined);
    invariant(key);
    const index_num = parseInt(index, 10);

    const oldArr = Array.isArray(state[key]) ? state[key] : [];

    // Pure immutable insert
    const newArr = [
      ...oldArr.slice(0, index_num),
      change.value,
      ...oldArr.slice(index_num),
    ];

    return {
      ...state,
      [key]: newArr,
    };
  }

  return state;
}

/*************************************************************
 * End: Edit Component Update State
 */

function EditPrimitiveField({
  node,
  path,
  state,
  handleChange,
  field,
}: {
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  field: FieldDefinition;
}) {
  const editor = useEditor();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const is_disabled = editor.is_disabled;
  useEffect(() => {
    forceUpdate();
  }, [is_disabled]);
  const EditComponent = getPrimitiveComponent(field.type);
  return (
    <EditComponent
      editor={editor}
      node={node}
      path={path}
      state={state}
      handleChange={handleChange}
      field={field}
    />
  );
}

function EditField({
  node,
  path,
  state,
  handleChange,
  parent,
  field,
}: {
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  parent: SchemaTypeDefinition | FieldDefinition;
  field: FieldDefinition;
}) {
  const mile = useMileProvider();

  // console.log("EditField", path, field, state, parent);
  const type = field.type;
  const isPrimitive = isPrimitiveType(type);
  if (isPrimitive) {
    return (
      <EditPrimitiveField
        node={node}
        path={path}
        state={state}
        handleChange={handleChange}
        field={field}
      />
    );
  }

  // handle parent array type
  if (parent.type === "array") {
    console.log("path.at(-1)", path.at(-1));
    console.log("path.at(-2)", path.at(-2));

    if (path.at(-1) !== type && path.at(-2) === parent.name) {
      // render specific item of the array
      // get type of item
      // @ts-expect-error okk
      const type = parent.of[0].type; // e.g. if parent.name is images, this type would be image
      const schema = mile.schema.get(type);
      return schema.fields?.map((e) => {
        return (
          <EditField
            key={e.name}
            node={node}
            path={e.name ? path.concat(e.name) : path}
            state={state}
            handleChange={handleChange}
            parent={schema}
            field={e}
          />
        );
      });
    }
    throw new Error(`Invalid path "${path.join(".")}" for type: ${field.type}`);
  }

  const schema = mile.schema.get(type);
  invariant(path.at(-1) === type);
  invariant(schema.name);

  return (
    <div className="space-y-3">
      <h3 className="font-bold">{schema.title}</h3>
      <EditFields
        node={node}
        path={path.slice(0, -1).concat(schema.name)}
        state={state}
        handleChange={handleChange}
        parent={schema}
        fields={schema.fields}
      />
    </div>
  );
}

function EditFields({
  node,
  path,
  state,
  handleChange,
  parent,
  fields,
}: {
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  parent: SchemaTypeDefinition | FieldDefinition;
  fields: FieldDefinition[] | undefined;
}) {
  // console.log("EditFields", {
  //   node,
  //   path,
  //   state,
  //   handleChange,
  //   fields,
  // });
  if (!fields) {
    return <div className="">No fields defined in schema</div>;
  }

  return (
    <div className="space-y-6">
      {fields.map((e) => {
        return (
          <EditField
            key={e.name}
            node={node}
            path={e.name ? path.concat(e.name) : path}
            state={state}
            handleChange={handleChange}
            parent={parent}
            field={e}
          />
        );
      })}
    </div>
  );
}

type Change = { op?: string; path: string[]; value: any };

function EditNode({ node }: { node: NodeData }) {
  const editor = useEditor();
  const mile = useMileProvider();
  const schema = mile.schema.get(node.type);

  if (!schema.fields) {
    console.log("no fields");
    return null;
  }
  console.log("schema", schema);
  console.log("node", node);

  const treenode = editor.getNode(node.id);
  console.log("treenode", treenode);

  const optionValue = treenode.options; // undefined or option value

  const [initialValue] = useState(() =>
    createInitialValue(optionValue, schema, mile.schema),
  );
  const [state, setState] = useState(() =>
    createInitialValue(optionValue, schema, mile.schema),
  );
  // console.log("EditNode", editor, node, schema, optionValue, state);

  const handleChange = (changes: Change[] | Change) => {
    const changeList = Array.isArray(changes) ? changes : [changes];

    const updatedState = changeList.reduce(
      (accState, change) =>
        updateState(accState, change, schema, editor.breakpoint, mile.schema),
      state,
    );

    // use updated state
    startTransition(() => {
      setState(updatedState);
      editor.perform({
        type: "updateNodeOption",
        name: `Update node option (${schema.name})`,
        payload: { nodeId: treenode.id, value: updatedState, initialValue },
      });
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-xl">{schema.title}</h3>
      <EditFields
        node={node}
        path={[]}
        state={state}
        handleChange={handleChange}
        parent={schema}
        fields={schema.fields}
      />
    </div>
  );
}

function Layers({
  data,
  state,
  dispatch,
}: {
  data: TreeData | undefined;
  state: AppState;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  function handleBackClick() {
    dispatch({ type: AppActionType.DeselectNode });
  }

  if (!data) return null;
  const nodes = data.root?.children?.map((e) => {
    return data[e];
  });

  if (state.activeNodeId !== null) {
    // re-render when node id changes (different key)
    return (
      <EditNodeSettings
        key={state.activeNodeId}
        onBackClick={handleBackClick}
        node={data[state.activeNodeId]}
      />
    );
  }

  return <LayersInner nodes={nodes} state={state} dispatch={dispatch} />;
}

function LayersInner({
  nodes,
  state,
  dispatch,
}: {
  nodes: NodeData[] | undefined;
  state: AppState;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  const mile = useMileProvider();
  const editor = useEditor();

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return !!source.data;
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!sourceData || !targetData) {
          return;
        }
        if (!nodes) {
          return;
        }

        const indexOfTarget = nodes.findIndex(
          (item) => item.id === (targetData.node as NodeData).id,
        );
        if (indexOfTarget < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);

        editor.perform({
          type: "reorderNode",
          name: "Reorder Node",
          payload: {
            dragId: (sourceData.node as NodeData).id,
            dropId: (targetData.node as NodeData).id,
            closestEdgeOfDrop: closestEdgeOfTarget,
            trigger: "pointer",
          },
        });
      },
    });
  }, [nodes, editor]);

  return (
    <div className="py-4">
      <div className="mb-2 flex items-center">
        <h3 className="px-4 text-[10px] uppercase tracking-wider select-none">
          Layers
        </h3>
        <PopoverComponentPicker schema={mile.schema} dispatch={dispatch} />
      </div>
      <div className="divide-y-1 divide-slate-300 border-y border-slate-300">
        {(nodes ?? []).map((e, i) => {
          return (
            <DragLayer
              key={e.id}
              node={e}
              mile_schema={mile.schema}
              dispatch={dispatch}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}

function PopoverComponentPicker({
  schema,
  dispatch,
}: {
  schema: MileSchema;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="px-1.5 py-1 text-xs font-medium rounded-md border border-slate-400 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center gap-x-1">
        <PlusIcon size={12} /> Add
      </PopoverTrigger>
      <PopoverContent className="w-md h-[500px] overflow-y-auto origin-[var(--transform-origin)] rounded-lg bg-[canvas] px-6 py-4 text-gray-900 shadow-lg shadow-gray-200 outline-1 outline-gray-200 transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
        <PopoverTitle className="text-base font-medium">
          Add Component
        </PopoverTitle>
        <div className="mt-6 space-y-4">
          <ComponentPicker
            schema={schema}
            close={() => setOpen(false)}
            dispatch={dispatch}
          />
        </div>
      </PopoverContent>
    </PopoverRoot>
  );
}

type DraggableState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement }
  | { type: "dragging" };

const idleState: DraggableState = { type: "idle" };
const draggingState: DraggableState = { type: "dragging" };

function DragLayer({
  node,
  mile_schema,
  dispatch,
  index,
}: {
  node: NodeData;
  mile_schema: MileSchema;
  dispatch: React.ActionDispatch<[action: AppAction]>;
  index: number;
}) {
  const schema = mile_schema.get(node.type);
  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [draggableState, setDraggableState] =
    useState<DraggableState>(idleState);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = ref.current;
    const dragHandle = dragHandleRef.current;
    invariant(element);
    invariant(dragHandle);

    const dragData = {
      node,
      index,
    };

    function onChange({ source, self }: ElementDropTargetEventBasePayload) {
      const isSource = source.element === dragHandle;
      if (isSource) {
        setClosestEdge(null);
        return;
      }

      const closestEdge = extractClosestEdge(self.data);

      const sourceIndex = source.data.index;
      invariant(typeof sourceIndex === "number");

      const isItemBeforeSource = index === sourceIndex - 1;
      const isItemAfterSource = index === sourceIndex + 1;

      const isDropIndicatorHidden =
        (isItemBeforeSource && closestEdge === "bottom") ||
        (isItemAfterSource && closestEdge === "top");

      if (isDropIndicatorHidden) {
        setClosestEdge(null);
        return;
      }

      setClosestEdge(closestEdge);
    }

    return combine(
      // registerItem({ itemId: item.id, element }),
      draggable({
        element: dragHandle,
        getInitialData: () => dragData,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            // getOffset: () => ({ x: 18, y: 18 }),
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "8px",
            }),
            render({ container }) {
              setDraggableState({ type: "preview", container });

              return () => setDraggableState(draggingState);
            },
          });
        },
        onDragStart() {
          setDraggableState(draggingState);
        },
        onDrop() {
          setDraggableState(idleState);
        },
      }),
      dropTargetForElements({
        element,
        // canDrop({ source }) {
        // 	return source.data.instanceId === instanceId;
        // },
        getData({ input }) {
          return attachClosestEdge(dragData, {
            element,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter: onChange,
        onDrag: onChange,
        onDragLeave() {
          setClosestEdge(null);
        },
        onDrop() {
          setClosestEdge(null);
        },
      }),
    );
  }, [index, node]);

  return (
    <>
      <div ref={ref} className="relative">
        <div className="w-full flex items-center justify-between gap-x-1 text-left px-4 transition-colors">
          <DragHandle dragHandleRef={dragHandleRef} />
          <div
            className={`w-full flex items-center ${draggableState.type === "dragging" ? "opacity-40" : ""}`}
          >
            <Layer node={node} dispatch={dispatch} mile_schema={mile_schema} />
          </div>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </div>
      {draggableState.type === "preview" &&
        ReactDOM.createPortal(
          <div
            style={{
              /**
               * Ensuring the preview has the same dimensions as the original.
               *
               * Using `border-box` sizing here is not necessary in this
               * specific example, but it is safer to include generally.
               */
              boxSizing: "border-box",
              position: "relative",
              // width: state.rect.width,
              // height: state.rect.height,
              // width: 36,
              height: 36,
            }}
          >
            {/*<DragPreview />*/}
            <div className="px-3 py-1.5 bg-white shadow-lg">
              {schema.title ?? schema.name}
            </div>
          </div>,
          draggableState.container,
        )}
    </>
  );
}

function Layer({
  node,
  mile_schema,
  dispatch,
}: {
  node: NodeData;
  mile_schema: MileSchema;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  const editor = useEditor();
  const schema = mile_schema.get(node.type);
  function handleDeleteNode() {
    const action = {
      type: "deleteNode",
      name: "Delete node",
      payload: { id: node.id },
    };
    editor.perform(action);
  }

  return (
    <>
      <button
        className={`py-1 w-full cursor-pointer hover:bg-slate-200`}
        onClick={() => {
          if (schema.isMarkdown) {
            dispatch({
              type: AppActionType.SelectMarkdownNode,
              payload: { id: node.id },
            });
          } else {
            dispatch({
              type: AppActionType.SelectNode,
              payload: { id: node.id },
            });
          }
        }}
      >
        <div className="text-sm flex items-center gap-x-1">
          {schema.isMarkdown ? (
            <span className="text-[8px] uppercase px-1 py-0.5 bg-zinc-400/80 rounded-sm text-white font-bold">
              MD
            </span>
          ) : null}
          {schema.title ?? schema.name}
        </div>
      </button>
      <button
        className="px-1 py-1 cursor-pointer hover:bg-slate-200"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteNode();
        }}
      >
        <TrashIcon size={12} />
      </button>
    </>
  );
}

function DragHandle({
  dragHandleRef,
}: {
  dragHandleRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      className="px-0.5 py-1 cursor-grab bg-gray-300 hover:bg-gray-400 rounded-[2px]"
      ref={dragHandleRef}
    >
      <GripVerticalIcon className="w-3 h-3 text-zinc-700" />
    </button>
  );
}

function buildNewUserNodePayload(schema: SchemaTypeDefinition) {
  const nodeId = generateId();
  const getInitialNodes = schema.getInitialNodes;
  if (!getInitialNodes) {
    throw new Error(
      `buildNewUserNodePayload: ${schema.type}. "getInitialNodes" function not found in mile.config.tsx file`,
    );
  }

  return {
    id: "root",
    // add new node to the end of root node
    mode: "last-child",
    nodeId,
    nodes: getInitialNodes(nodeId, generateId),
    // nodes: {
    //   [nodeId]: getInitialNodeData(nodeId),
    // },
  };
}

function ComponentPicker({
  schema,
  close,
  dispatch,
}: {
  schema: MileSchema;
  close: () => void;
  dispatch: React.ActionDispatch<[action: AppAction]>;
}) {
  const editor = useEditor();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
      {schema.component_library_schema.map((e) => {
        function handleClick() {
          const payload = buildNewUserNodePayload(e);
          console.log("payload", payload);

          editor.perform({
            type: "addNode",
            name: "Add Node",
            payload,
          });
          close();
          if (e.type === "paragraph") {
            // dispatch "SelectMarkdownNode" if it's a paragraph type since paragraph is the initial type of markdown mode (see markdown_schema)
            dispatch({
              type: AppActionType.SelectMarkdownNode,
              payload: {
                id: payload.nodeId,
              },
            });
          } else {
            // otherwise dispatch "SelectNode" for other user component types
            dispatch({
              type: AppActionType.SelectNode,
              payload: {
                id: payload.nodeId,
              },
            });
          }
        }
        return (
          <div
            className="py-2 px-2 bg-zinc-100 border border-zinc-200 space-y-2"
            key={e.type}
          >
            <button onClick={handleClick}>
              <div className="">
                <img src={e.thumbnail} alt="" className="" />
              </div>
              <h4 className="font-semibold text-sm text-center">{e.title}</h4>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EditNodeSettings({
  onBackClick,
  node,
}: {
  onBackClick: () => void;
  node: NodeData;
}) {
  return (
    <div className="py-4">
      <button
        onClick={onBackClick}
        className="ml-4 pl-2 pr-3 py-1 flex items-center gap-x-1 bg-slate-600 hover:bg-slate-700 transition-colors rounded-full text-white text-[10px] uppercase tracking-wider"
      >
        <ChevronLeft size={12} />
        Back
      </button>
      <div className="mt-4 px-4">
        <EditNode node={node} />
      </div>
    </div>
  );
}

function getIframeBodyHeight(iframe: HTMLIFrameElement | null, zoom: number) {
  if (!iframe) {
    throw new Error("Iframe is unavailable");
  }
  const scrollHeight = iframe.contentDocument?.body.scrollHeight;
  const offsetHeight = iframe.contentDocument?.body.offsetHeight;
  // console.log('scrollHeight', scrollHeight);
  return scrollHeight ?? offsetHeight;
  // if (scrollHeight) {
  //   // return scrollHeight - HEADER_HEIGHT / zoom;
  //   return scrollHeight - HEADER_HEIGHT;
  // }
  // if (offsetHeight) {
  //   // return offsetHeight - HEADER_HEIGHT / zoom;
  //   return offsetHeight - HEADER_HEIGHT;
  // }
  // throw new Error("Failed to retrieve iframe body height");
}

function getViewportWidthString() {
  return `${window.innerWidth}px`;
}

function MileHeader({
  frameRef,
  iframe_state,
  dispatch_iframe,
}: {
  frameRef: React.RefObject<IFrame | null>;
  iframe_state: IframeState;
  dispatch_iframe: React.ActionDispatch<[action: IframeAction]>;
}) {
  const editor = useEditor();
  function handleHeaderSavePage() {
    editor.save();
  }
  function handleHeaderPublishPage() {
    editor.publish();
  }

  return (
    <div className="mile-header h-[40px] bg-white" style={{ zIndex: 2 }}>
      <div className="mile-headLeft">
        <a
          href="/mile/pages"
          className="text-xs flex items-center gap-x-0.5 [&_svg]:text-zinc-400 hover:[&_svg]:text-zinc-900"
        >
          <ChevronLeft size={16} /> Pages
        </a>
        <Divider />
        <button
          onClick={() => editor.undo()}
          className="px-2 py-1 flex gap-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded cursor-pointer"
        >
          Undo
        </button>
        <button
          onClick={() => editor.redo()}
          className="px-2 py-1 flex gap-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded cursor-pointer"
        >
          Redo
        </button>
        <Divider />
        <div className="flex gap-[1px] bg-white /p-2">
          <button
            type="button"
            className={`mile-controls-item w-[26px] ${iframe_state.breakpoint === "desktop" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch_iframe({
                  type: IframeActionType.SetBreakpointDesktop,
                  payload: { w: getViewportWidthString() },
                });
              });
              const iframeBodyHeight = getIframeBodyHeight(
                frameRef.current,
                iframe_state.zoom,
              );
              dispatch_iframe({
                type: IframeActionType.SetHeight,
                payload: `${iframeBodyHeight}px`,
              });
              editor.setBreakpoint("desktop");
            }}
          >
            <LaptopIcon className="w-[20px] h-[20px]" />
          </button>
          <button
            type="button"
            className={`mile-controls-item w-[26px] ${iframe_state.breakpoint === "tablet" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch_iframe({
                  type: IframeActionType.SetBreakpointTablet,
                  payload: { w: "768px" },
                });
                editor.setBreakpoint("tablet");
              });
              // const iframeBodyHeight = getIframeBodyHeight(frameRef.current, iframe_state.zoom);
              // dispatch_iframe({
              //   type: IframeActionType.SetHeight,
              //   payload: `${iframeBodyHeight}px`,
              // });
            }}
          >
            <TabletIcon className="w-[17px] h-[17px]" />
          </button>
          <button
            type="button"
            className={`mile-controls-item w-[26px] ${iframe_state.breakpoint === "mobile" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch_iframe({
                  type: IframeActionType.SetBreakpointMobile,
                  payload: { w: "390px" },
                });
              });
              const iframeBodyHeight = getIframeBodyHeight(
                frameRef.current,
                iframe_state.zoom,
              );
              dispatch_iframe({
                type: IframeActionType.SetHeight,
                payload: `${iframeBodyHeight}px`,
              });
              editor.setBreakpoint("mobile");
            }}
          >
            <SmartphoneIcon className="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>
      <MileHeaderPageSettings />
      <div className="mile-headRight">
        <button
          type="button"
          className="px-2 py-1.5 rounded-[4px] cursor-pointer flex items-center gap-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
          onClick={() => console.log("print------", editor.tree.data)}
        >
          Print
        </button>
        <PagePreviewButton
          draft_id={editor.draft_data.id}
          page_id={editor.draft_data.page_id}
        />
        <button
          type="button"
          className="px-3 py-1.5 rounded-[4px] cursor-pointer text-xs bg-black hover:bg-zinc-800 text-white"
          onClick={handleHeaderSavePage}
        >
          Save
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-[4px] cursor-pointer text-xs bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleHeaderPublishPage}
        >
          Publish
        </button>
      </div>
    </div>
  );
}

function PagePreviewButton({
  draft_id,
  page_id,
}: {
  draft_id: string;
  page_id: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handlePreviewPageClick() {
    setIsLoading(true);
    const resp = await fetch(`${API}/drafts/${draft_id}/preview-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id }),
    });
    if (!resp.ok) {
      setIsLoading(false);
      const error = new Error(
        "An error occurred while generating the preview token.",
      );
      const info = await resp.json();
      console.error("Error generating the preview token", info);
      // @ts-expect-error okk
      error.info = info;
      // @ts-expect-error okk
      error.status = resp.status;
      throw error;
    }
    setIsLoading(false);
    const result = await resp.json();
    if (result) {
      window.location.assign(`/preview/${result.token}`);
    }
  }
  return (
    <button
      type="button"
      className="px-3 py-1.5 rounded-[4px] cursor-pointer flex items-center gap-1 text-xs bg-white hover:bg-zinc-50 text-zinc-700 inset-ring inset-ring-zinc-400 hover:text-black hover:inset-ring-zinc-500 disabled:bg-zinc-300"
      onClick={handlePreviewPageClick}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}{" "}
      Preview <SquareArrowOutUpRight size={10} className="text-black" />
    </button>
  );
}

function MileHeaderPageSettings() {
  const editor = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  // console.log("editor.draft_data", editor.draft_data);

  return (
    <div className="mile-headCenter w-[500px] justify-center">
      <div className="text-sm font-semibold text-ellipsis">
        {editor.draft_data.title ?? "Untitled"}
      </div>
      <DialogRoot open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={() => (
            <button
              onClick={() => {
                setIsOpen(true);
              }}
              className="px-1.5 py-1 select-none flex items-center gap-x-1 text-[10px] font-medium rounded-[4px] text-zinc-700 bg-zinc-100 hover:bg-zinc-100 border border-zinc-300 hover:border-zinc-500"
            >
              <PencilIcon size={8} /> Edit
            </button>
          )}
        />
        <DialogContent className="fixed top-[40px] left-0 bottom-0 /top-1/2 /left-1/2 w-lg max-w-[calc(100vw-3rem)] /-translate-x-1/2 /-translate-y-1/2 /rounded-lg bg-zinc-50 p-6 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 /data-[ending-style]:scale-90 data-[ending-style]:-translate-x-6 data-[ending-style]:opacity-0 /data-[starting-style]:scale-90 data-[starting-style]:-translate-x-6 data-[starting-style]:opacity-0">
          <DialogTitle className="-mt-1.5 mb-1 text-lg font-medium">
            Edit Page Data
          </DialogTitle>
          <div className="overflow-y-auto h-full">
            <PageSettings close={() => setIsOpen(false)} />
          </div>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function PageSettings({ close }: { close: () => void }) {
  const editor = useEditor();
  // TODO: move this inside SlugInput?
  const parent = useSWR(
    editor.draft_data.parent_id
      ? [`/pages/`, editor.draft_data.parent_id]
      : null,
    fetcher,
  );
  console.log("parent", parent);

  return <PageSettingsReady parent={parent} close={close} />;
}

function PageSettingsReady({ parent, close }: any) {
  const editor = useEditor();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col py-8">
      <div className="space-y-4">
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="title" className="font-semibold text-sm">
              Title
            </label>
            <Input
              id="title"
              value={editor.draft_data.title}
              onChange={(e) => {
                const value = e.target.value;
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "title", value: value },
                });
              }}
              placeholder="e.g. About us"
            />
            <div className="mt-1 text-xs text-zinc-600">
              Title of the page displayed on the browser
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="type" className="font-semibold text-sm">
              Type
            </label>
            <Input
              id="type"
              value={editor.draft_data.type}
              onChange={(e) => {
                const value = e.target.value;
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "type", value },
                });
              }}
              placeholder="e.g. page or post"
            />
            <div className="mt-1 text-xs text-zinc-600">"page" or "post"</div>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full relative">
            <SlugInput
              value={editor.draft_data.slug}
              onChange={(v) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "slug", value: v },
                });
              }}
              title={editor.draft_data.title}
              parentId={editor.draft_data.parent_id}
              parentTitle={parent?.data?.title}
              onParentChange={(parent_id: string | null) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "parent_id", value: parent_id },
                });
              }}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="metadescription" className="font-semibold text-sm">
              Meta Description
            </label>
            <Field.Control
              id="metadescription"
              value={
                editor.draft_data.description == null
                  ? ""
                  : editor.draft_data.description
              }
              onValueChange={(value) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "description", value },
                });
              }}
              render={<Textarea rows={4} />}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label className="font-semibold text-sm">Open graph Image</label>
            <PageOpenGraphImage
              image_id={
                editor.draft_data.og_image_ids.length > 0
                  ? editor.draft_data.og_image_ids[0]
                  : undefined
              }
              onImageIdChange={(v) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "og_image_ids", value: [v] },
                });
              }}
            />
            <div className="mt-1 text-xs text-zinc-600">
              Used in social media preview
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="canonical_url" className="font-semibold text-sm">
              Canonical URL
            </label>
            <Field.Control
              id="canonical_url"
              value={
                editor.draft_data.canonical_url == null
                  ? ""
                  : editor.draft_data.canonical_url
              }
              onValueChange={(value) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "canonical_url", value },
                });
              }}
              render={<Textarea rows={2} />}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="keywords" className="font-semibold text-sm">
              Keywords
            </label>
            <Field.Control
              id="keywords"
              value={
                editor.draft_data.keywords == null
                  ? ""
                  : editor.draft_data.keywords
              }
              onValueChange={(value) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "keywords", value },
                });
              }}
              render={<Textarea rows={4} />}
            />
            <div className="mt-1 text-xs text-zinc-600">
              Comma-separated list of keywords for search engines
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="content" className="font-semibold text-sm">
              Content
            </label>
            <Field.Control
              id="content"
              value={editor.draft_data.content as string}
              onValueChange={(value) => {
                editor.updateDraftData({
                  type: "UpdateField",
                  payload: { key: "content", value },
                });
              }}
              render={<Textarea rows={4} />}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label className="font-semibold text-sm flex flex-row items-center gap-x-2">
              Do not index page
              <Switch.Root
                checked={Boolean(editor.draft_data.no_index)}
                onCheckedChange={(v) => {
                  editor.updateDraftData({
                    type: "UpdateField",
                    payload: { key: "no_index", value: v === true ? 1 : 0 },
                  });
                }}
                className="relative flex h-6 w-10 rounded-full bg-gradient-to-r from-gray-700 from-35% to-gray-200 to-65% bg-[length:6.5rem_100%] bg-[100%_0%] bg-no-repeat p-px shadow-[inset_0_1.5px_2px] shadow-gray-200 outline outline-1 -outline-offset-1 outline-gray-200 transition-[background-position,box-shadow] duration-[125ms] ease-[cubic-bezier(0.26,0.75,0.38,0.45)] before:absolute before:rounded-full before:outline-offset-2 before:outline-blue-800 focus-visible:before:inset-0 focus-visible:before:outline focus-visible:before:outline-2 active:bg-gray-100 data-[checked]:bg-[0%_0%] data-[checked]:active:bg-gray-500 dark:from-gray-500 dark:shadow-black/75 dark:outline-white/15 dark:data-[checked]:shadow-none"
              >
                <Switch.Thumb className="aspect-square h-full rounded-full bg-white shadow-[0_0_1px_1px,0_1px_1px,1px_2px_4px_-1px] shadow-gray-100 transition-transform duration-150 data-[checked]:translate-x-4 dark:shadow-black/25" />
              </Switch.Root>
            </label>
            <div className="mt-1 text-xs text-zinc-600">
              {Boolean(editor.draft_data.no_index) ? (
                <div className="text-red-700 flex flex-row items-center gap-x-1">
                  <CircleXIcon size={12} />
                  This page will not be indexed by search engines.
                </div>
              ) : (
                <div className="text-green-600  flex flex-row items-center gap-x-1">
                  <CircleCheckIcon size={12} />
                  Search engines are allowed to index this page.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 w-full">
        {error ? (
          <div className="mb-2 text-xs text-red-600">{error}</div>
        ) : null}
        {/*<Button
          onClick={handleSavePage}
          className="w-full py-3 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          Save
        </Button>*/}
      </div>
    </div>
  );
}

function fetchStringKey(key: string) {
  return fetch(`${API}${key}`).then((r) => r.json());
}

function useMediaFile(media_id?: string) {
  return useSWR(media_id ? `/medias/${media_id}` : null, fetchStringKey);
}

function getImageUrl(key: string) {
  return `${NEXT_PUBLIC_IMAGE_URL}/${key}`;
}

function PageOpenGraphImage({
  image_id,
  onImageIdChange,
}: {
  image_id?: string;
  onImageIdChange: (v: string) => void;
}) {
  const [selectedFileId, setSelectedFileId] = useState(image_id);
  const [open, setOpen] = useState(false);
  const { data, error } = useMediaFile(selectedFileId);

  function handleConfirmFile(file_id: string, data: any) {
    if (!data) {
      toast.error(
        `Selecting file failed. Please choose different file. Or refresh the page and try agian.`,
      );
      return;
    }
    onImageIdChange(file_id);
    setSelectedFileId(file_id);
    setOpen(false);
  }

  async function handleUploadSuccess(upload: any) {
    // save db
    const medias = await mutate(`/medias`, async (prev: any) => {
      const res = await saveImagesToDB([
        {
          id: generateId(),
          type: upload.file.type,
          size: upload.file.size,
          filepath: upload.file.objectInfo.key,
          width: upload.file.width,
          height: upload.file.height,
        },
      ]);
      if (res.length === 0) {
        console.error("No media uploaded");
        return prev;
      }
      const [media] = res;
      onImageIdChange(media.id);
      setSelectedFileId(media.id);
      return prev ? [...prev, ...res] : res;
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      {data ? (
        <div className="max-w-[150px]">
          <img src={getImageUrl(data.filepath)} alt="" />
        </div>
      ) : null}
      <div className="flex items-center gap-x-2">
        <Uploader
          is_disabled={false}
          onSuccess={handleUploadSuccess}
          label={image_id ? "Change image" : "Upload image"}
        />
        <ImageGalleryDialog
          key={selectedFileId}
          is_disabled={false}
          open={open}
          setOpen={setOpen}
          handleConfirmFile={handleConfirmFile}
          initialSelectedFileId={selectedFileId}
        />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-[2px] h-[20px] bg-gray-200 my-1 mx-2" />;
}

// Save db after multiple uploads completed
function handleUploadsSuccess(upload: any) {
  console.log("handleUploadsSuccess", upload);

  // save db
  const payload = upload.files.map((e: any) => {
    return {
      id: generateId(),
      type: e.type,
      size: e.size,
      width: e.width,
      height: e.height,
      filepath: e.objectInfo.key,
    };
  });
  mutate(`/medias`, async (prev: any) => {
    const res = await saveImagesToDB(payload);
    return prev ? [...prev, ...res] : res;
  });
}

function ImageGalleryDialog({
  open,
  setOpen,
  initialSelectedFileId,
  handleConfirmFile,
  is_disabled,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  initialSelectedFileId?: string;
  handleConfirmFile: (file_id: string, data: any) => void;
  is_disabled: boolean;
}) {
  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={is_disabled} className="cursor-pointer">
            <ImagesIcon /> Gallery
          </Button>
        }
      />
      <DialogContent className="flex flex-col fixed top-[calc(50%+20px)] left-1/2 w-full max-w-[calc(100vw-3rem)] h-[calc(100vh*6/7)] -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl bg-gray-50 outline-1 outline-gray-400 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
        <div className="py-2 px-3 flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            <DialogTitle className="text-lg font-medium">Gallery</DialogTitle>
            <Uploaders
              onSuccess={handleUploadsSuccess}
              label={"Upload files"}
            />
          </div>
          <div className="flex gap-4">
            <Dialog.Close className="flex h-9 text-xs items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 font-medium text-gray-900 select-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100">
              Close
            </Dialog.Close>
          </div>
        </div>
        <ImageGallery
          initialSelectedFileId={initialSelectedFileId}
          handleConfirmFile={handleConfirmFile}
        />
      </DialogContent>
    </DialogRoot>
  );
}
