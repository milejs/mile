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
  FieldDefinition,
  MileEditor,
  MileSchema,
  NodeData,
  Operation,
  PageData,
  PageMetaData,
  RouterLike,
  Schema,
  SchemaTypeDefinition,
  TreeData,
} from "@milejs/types";
import { tinykeys } from "@/lib/tinykeys";
import { flushSync } from "react-dom";
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  CircleCheckIcon,
  CircleXIcon,
  ImagesIcon,
  LaptopIcon,
  PencilIcon,
  PlusIcon,
  SmartphoneIcon,
  SquareArrowOutUpRight,
  TabletIcon,
  TrashIcon,
  Upload,
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
import { Popover } from "@base-ui-components/react/popover";
import { mdxToTree } from "./data";
import { generateId } from "@/lib/generate-id";
import { toast, Toaster } from "sonner";
import {
  getImageDimension,
  Uploader,
  Uploaders,
} from "@/components/ui/uploader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@base-ui-components/react/dialog";
import { filesize } from "./utils";
import { Field } from "@base-ui-components/react/field";
import { Checkbox } from "@base-ui-components/react/checkbox";
import slugify from "@sindresorhus/slugify";
import { LocalPageData, ParentPageValue, SlugInput } from "./shared";
import { Switch } from "@base-ui-components/react/switch";
// editor
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  DefaultReactSuggestionItem,
  FileCaptionButton,
  FileReplaceButton,
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
  BlockNoteEditor,
  BlockNoteSchema,
  combineByGroup,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";

export { BlockNoteView, useCreateBlockNote };

const HEADER_HEIGHT = 40;
const NEXT_PUBLIC_HOST_URL = process.env.NEXT_PUBLIC_HOST_URL;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;
const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const fetcher = (key: string[]) =>
  fetch(`${API}${key.join("")}`).then((res) => res.json());

const resolvePath = (paths: string[] = []) => {
  const hasPath = paths.length > 0;
  const isEdit = hasPath ? paths[paths.length - 1] === "edit" : false;
  const isIframeContent = hasPath
    ? paths[paths.length - 1] === "__iframe_content__"
    : false;
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
    <MileInner isEdit={isEdit} isIframeContent={isIframeContent} path={path} />
  );
}

function MileInner({
  isEdit,
  isIframeContent,
  path,
}: {
  isEdit: boolean;
  isIframeContent: boolean;
  path: string;
}) {
  let {
    data: page_data,
    error: pageError,
    isLoading: pageIsLoading,
  } = useSWR([`/pages`, path], fetcher);
  // console.log("MileInner", page_data, pageError, pageIsLoading);

  if (pageError) return <div>failed to load</div>;
  if (pageIsLoading) return <div>loading...</div>;
  if (!page_data) {
    return <div>no data</div>;
  }
  /**
   * {
    "id": "2950199bae37fa6fb854bd7773fb7fc9",
    "parent_id": null,
    "slug": "/",
    "name": "Home",
    "title": "Home",
    "content": "<Hero id=\"e5472bffdba8d51fe249b704b8e39b2a\" type=\"hero\" className=\"\" options={{title:\"Supreme Vascular and Inter\",image:{image_url:\"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-2.jpg\",alt_text:\"Side mirror\"},link:{url:\"/contact-us\",link_text:\"Book Appointment\",is_external:true}}} />",
    "description": null,
    "keywords": null,
    "llm": null,
    "no_index": null,
    "no_follow": null,
    "created_at": "2025-10-08T03:25:40.216Z",
    "updated_at": "2025-10-08T06:36:29.395Z"
}
   */

  return (
    <MileReady
      page_data={page_data}
      isEdit={isEdit}
      isIframeContent={isIframeContent}
      path={path}
    />
  );
}

function MileReady({
  isEdit,
  isIframeContent,
  path,
  page_data,
}: {
  isEdit: boolean;
  isIframeContent: boolean;
  path: string;
  page_data: PageData;
}) {
  // console.log({ isEdit, isIframeContent, path, page_data });
  const tree = useMemo(() => {
    if (page_data && page_data.content) {
      if (typeof page_data.content === "string") {
        const { result, error } = mdxToTree(page_data.content);
        // console.log('result', result);
        return new Tree(result.content);
      } else {
        return new Tree(page_data.content ?? {});
      }
    }
    return new Tree({
      root: {
        type: "root",
        id: "root",
        props: {},
        options: {},
        children: [],
      },
    });
  }, [page_data]);
  const [data, setData] = useState<TreeData | undefined>(() => tree?.data);
  const [lastOperation, setLastOperation] = useState<Operation | null>(null);
  //
  const frameRef = useRef<IFrame | null>(null);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  useEffect(() => {
    if (!frameRef.current) return;
    if (!frameRef.current.contentWindow) return;
    // Create channel for parent->iframe communication
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
  // console.log('tree', tree);

  if (isEdit) {
    return (
      <>
        <EditorProvider
          page_data={page_data}
          tree={tree}
          setData={setDataAndSend}
          setLastOperation={setLastOperation}
        >
          <MileFrame
            title={page_data?.title ?? "Title"}
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

  if (isIframeContent) {
    return <Preview slug={path} />;
  }

  return null;
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

function MileFrame({
  data,
  iframeSrc,
  frameRef,
  channelRef,
  title,
}: {
  frameRef: React.RefObject<IFrame | null>;
  channelRef: React.RefObject<any | null>;
  data: TreeData | undefined;
  title?: string;
  iframeSrc: string;
}) {
  const editor = useEditor();
  const mile = useMileProvider();
  const [iframe_state, dispatch_iframe] = useReducer(
    iframeReducer,
    initialIframeState,
  );
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const editorRef = useRef<{
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

  function handleDoneClick() {
    const md = editorRef.current?.getMarkdown();
    if (state.activeNodeId && md) {
      editor.mergeMarkdownData(state.activeNodeId, md);
    }
    dispatch({ type: AppActionType.DeselectNode });
  }

  function handleDiscardClick() {
    dispatch({ type: AppActionType.DeselectNode });
  }

  function handleOpenChange(v: boolean) {
    if (v) {
      dispatch({ type: AppActionType.OpenMarkdownEditor });
    } else {
      dispatch({ type: AppActionType.CloseMarkdownEditor });
    }
  }

  // console.log("data", data);

  return (
    <div className="flex flex-col h-screen">
      <MileHeader
        title={title}
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
      <Dialog.Root
        open={state.isMarkdownEditorOpen}
        onOpenChange={handleOpenChange}
        dismissible={false}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup className="px-6 py-4 fixed bottom-0 top-1/2 left-1/2 min-h-[200px] w-full max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
            <div className="mb-4 flex flex-row justify-between items-center">
              <Dialog.Title className="text-lg font-medium">Edit</Dialog.Title>
              <div className="flex flex-row items-center gap-x-2">
                <Button
                  onClick={handleDiscardClick}
                  className="px-3 py-1 rounded text-sm"
                  variant="secondary"
                  size="sm"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleDoneClick}
                  className="px-3 py-1 rounded text-sm"
                  size="sm"
                >
                  Done
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto h-full pb-20">
              {state.activeNodeId && (
                <OverlayTextEditor
                  key={state.activeNodeId}
                  ref={editorRef}
                  activeNodeId={state.activeNodeId}
                  initialContent={buildTextEditorInitialContentForSingleNode(
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
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function buildTextEditorInitialContentForSingleNode(
  node_id: string | null,
  data: TreeData | undefined,
  schema: MileSchema,
) {
  const node = node_id && data ? data[node_id] : null;
  console.log("buildTextEditorInitialContentForSingleNode node", node);
  if (!node) return [];

  // this should handle built-in node type from blocknote
  // type: paragraph | heading | quote | bulletListItem | numberedListItem | checkListItem |
  // toggleListItem | image | video | table | codeBlock | audio | file
  return [
    {
      id: node?.id || "",
      type: node?.type || "",
      props: node?.props || {},
      content: buildInlineContent(node?.children || [], data) || [], // {type, text, styles}
      children: [],
    },
  ];
}

function buildInlineContent(children: string[], data: TreeData | undefined) {
  if (!data) return [];
  return children.map((child_id) => {
    const node = data[child_id];
    if (node.type === "text") {
      return {
        type: "text",
        text: node.props?.value,
        styles: {},
      };
    } else if (node.type === "strong") {
      return {
        type: "text",
        text: node.children
          ? data[node.children[0]].props?.value || ""
          : "bad text",
        styles: { bold: true },
      };
    } else if (node.type === "link") {
      if (node.children) {
        return {
          type: "link",
          content: [
            {
              type: "text",
              // TODO: should we loop over children?
              text: data[node.children[0]].props?.value || "",
              styles: {},
            },
          ],
          href: node.props?.href ?? "",
        };
      }
      return {
        type: "link",
        content: [
          {
            type: "text",
            text: "bad link",
            styles: {},
          },
        ],
        href: "",
      };
    } else {
      throw new Error(`Unsupported node type: ${node.type}`);
    }
  });
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
  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        heading: createHeadingBlockSpec({
          // Disables toggleable headings.
          allowToggleHeadings: false,
          // Sets the allowed heading levels.
          levels: [1, 2, 3, 4, 5, 6],
        }),
      },
    }),
    initialContent,
  });

  useImperativeHandle(ref, () => {
    return {
      getDocument() {
        return editor.document;
      },
      getMarkdown() {
        return editor.blocksToMarkdownLossy();
      },
    };
  }, [editor]);

  return (
    <BlockNoteView editor={editor} formattingToolbar={false} theme="light">
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
            <ColorStyleButton key={"colorStyleButton"} />
            <NestBlockButton key={"nestBlockButton"} />
            <UnnestBlockButton key={"unnestBlockButton"} />*/}
            <CreateLinkButton key={"createLinkButton"} />
          </FormattingToolbar>
        )}
      />
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

// function NodeInspector({ data }: { data: any }) {
//   const editor = useEditor();
//   const mile = useMileProvider();
//   if (editor.activeNodeId === null) {
//     return <div className="">Select a node to inspect.</div>;
//   }

//   const node = data[editor.activeNodeId];
//   console.log("Inspector", editor.activeNodeId, node, data);
//   const schema = mile.schema.get(node.type);

//   if (schema.isMarkdown) {
//     return <EditMarkdown node={node} />;
//   }

//   return (
//     <div className="px-4 py-4">
//       <EditNode node={node} />
//     </div>
//   );
// }

function EditMarkdown({ node }: { node: NodeData }) {
  return <div className="">Edit markdown</div>;
}

const primitiveTypes = [
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

const insertHelloWorldItem = (editor: BlockNoteEditor) => ({
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
  editor: BlockNoteEditor,
): DefaultReactSuggestionItem[] => {
  // const defaults = getDefaultReactSlashMenuItems(editor);
  const defaults = getDefaultReactSlashMenuItems(editor).filter(
    (e) => !e.title.startsWith("Toggle Heading"),
  );

  return [...defaults, insertHelloWorldItem(editor)];
};

const bn_schema = BlockNoteSchema.create({
  blockSpecs: {
    // audio: defaultBlockSpecs.audio,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    // codeBlock: defaultBlockSpecs.codeBlock,
    divider: defaultBlockSpecs.divider,
    file: defaultBlockSpecs.file,
    heading: defaultBlockSpecs.heading,
    image: defaultBlockSpecs.image,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    paragraph: defaultBlockSpecs.paragraph,
    quote: defaultBlockSpecs.quote,
    table: defaultBlockSpecs.table,
    // toggleListItem: defaultBlockSpecs.toggleListItem,
    video: defaultBlockSpecs.video,
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

type EditComponentProps = {
  editor: MileEditor;
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  field: FieldDefinition;
};

import {
  useUploadFile,
  useUploadFiles,
  FileUploadInfo,
} from "better-upload/client";

function EditRichtextComponent({
  editor,
  node,
  path,
  state,
  handleChange,
  field,
}: EditComponentProps) {
  const value = getFieldValue(state, path);

  const { control, upload } = useUploadFile({
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
    uploadFile: async (file) => {
      const result = await upload(file);
      console.log("result", result);
      const dims = await getImageDimension(file).catch((e) => {
        console.error("Error getting image dimensions", e);
        return undefined;
      });
      const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${result.file.objectKey}`;

      // save db
      mutate(`/medias`, async (prev: any) => {
        const resp = await fetch(`${API}/medias`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              id: generateId(),
              type: result.file.type,
              size: result.file.size,
              filepath: result.file.objectKey,
              width: dims?.width,
              height: dims?.height,
            },
          ]),
        });
        if (!resp.ok) {
          const error = new Error("An error occurred while saving the images.");
          const info = await resp.json();
          console.error("Error saving images", info);
          // @ts-expect-error okk
          error.info = info;
          // @ts-expect-error okk
          error.status = resp.status;
          throw error;
        }
        const res = await resp.json();
        return prev ? [...prev, ...res] : res;
      });

      return image_url;

      // const body = new FormData();
      // body.append("file", file);
      // const ret = await fetch("https://tmpfiles.org/api/v1/upload", {
      //   method: "POST",
      //   body: body,
      // });
      // return (await ret.json()).data.url.replace(
      //   "tmpfiles.org/",
      //   "tmpfiles.org/dl/",
      // );
    },
    // uploadFile: async (file) => {
    //   const formData = new FormData();
    //   formData.append("file", file);
    //   const response = await fetch("/api/upload", {
    //     method: "POST",
    //     body: formData,
    //   });
    //   const data = await response.json();
    //   return data.url;
    // },
  });

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      // @ts-expect-error okk
      filterSuggestionItems(getCustomSlashMenuItems(bn_editor), query);
  }, [bn_editor]);

  function handleEditorChange(editor: BlockNoteEditor) {
    const content = editor.document;
    handleChange({ path, value: content });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <BlockNoteView
        // @ts-expect-error okk
        editor={bn_editor}
        onChange={handleEditorChange}
        formattingToolbar={false}
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
    path[path.length - 2] === "image" &&
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

  const value = getFieldValue(state, path);

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
        "objectKey": "mileupload/2024-drive-the-icons-monterey-car-week-tour-13-jpg",
        "objectMetadata": {}
      },
      metadata: {}
     */
    const image_url = `${NEXT_PUBLIC_IMAGE_URL}/${upload.file.objectKey}`;
    const path_alt_text = getAltTextPath(path);
    handleChange([
      { path, value: image_url },
      { path: path_alt_text, value: "" }, // empty alt for newly upload file
    ]);

    // save db
    mutate(`/medias`, async (prev: any) => {
      const resp = await fetch(`${API}/medias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            id: generateId(),
            type: upload.file.type,
            size: upload.file.size,
            filepath: upload.file.objectKey,
            width: upload.file.width,
            height: upload.file.height,
          },
        ]),
      });
      if (!resp.ok) {
        const error = new Error("An error occurred while saving the images.");
        const info = await resp.json();
        console.error("Error saving images", info);
        // @ts-expect-error okk
        error.info = info;
        // @ts-expect-error okk
        error.status = resp.status;
        throw error;
      }
      const res = await resp.json();
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
        <ImageGallery
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

function getFieldValue(state: any, path: string[]) {
  if (path.length === 0) {
    return state;
  }
  if (state == null) {
    return state;
  }
  const [first, ...rest] = path;
  invariant(first);
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
  path: string[],
  value: any,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
  schema: MileSchema,
) {
  if (state == null) {
    const initializeState = createInitialValue(state, field, schema);
    // console.log("field", field, initializeState);
    return updateNestedState(initializeState, path, value, field, breakpoint);
  }
  return updateNestedState(state, path, value, field, breakpoint);
}

function updateNestedState(
  state: any,
  path: string[],
  value: any,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
): any {
  if (field.isResponsive) {
    return {
      ...state,
      [breakpoint]: updateNestedStateRec(
        state[breakpoint],
        path,
        value,
        field,
        breakpoint,
      ),
    };
  }
  return updateNestedStateRec(state, path, value, field, breakpoint);
}

function updateNestedStateRec(
  state: any,
  path: string[],
  value: any,
  field: any,
  breakpoint: "desktop" | "tablet" | "mobile",
): any {
  // console.log('state', state, path, value);
  if (path.length === 0) {
    return value;
  }
  invariant(
    typeof state !== "string" &&
      typeof state !== "number" &&
      typeof state !== "boolean",
  );
  const [key, ...restPath] = path;
  invariant(key);
  return {
    ...state,
    [key]: updateNestedStateRec(state[key], restPath, value, field, breakpoint),
  };
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
  field,
}: {
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
  field: FieldDefinition;
}) {
  const mile = useMileProvider();

  // console.log('EditField', path, field.type, state);
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
  fields,
}: {
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (changes: Change[] | Change) => void;
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
            field={e}
          />
        );
      })}
    </div>
  );
}

type Change = { path: string[]; value: any };

function EditNode({ node }: { node: NodeData }) {
  const editor = useEditor();
  const mile = useMileProvider();
  const schema = mile.schema.get(node.type);

  if (!schema.fields) {
    console.log("no fields");
    return null;
  }

  const treenode = editor.getNode(node.id);
  const optionValue = treenode.options; // undefined or option value

  const [initialValue] = useState(() =>
    createInitialValue(optionValue, schema, mile.schema),
  );
  const [state, setState] = useState(() =>
    createInitialValue(optionValue, schema, mile.schema),
  );
  console.log("EditNode", editor, node, schema, optionValue, state);

  const handleChange = (changes: Change[] | Change) => {
    const changeList = Array.isArray(changes) ? changes : [changes];

    const updatedState = changeList.reduce(
      (accState, { path, value }) =>
        updateState(
          accState,
          path,
          value,
          schema,
          editor.breakpoint,
          mile.schema,
        ),
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
  const [open, setOpen] = useState(false);

  return (
    <div className="py-4">
      <div className="mb-2 flex items-center">
        <h3 className="px-4 text-[10px] uppercase tracking-wider select-none">
          Layers
        </h3>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger className="px-1.5 py-1 text-xs font-medium rounded-md border border-slate-400 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center gap-x-1">
            <PlusIcon size={12} /> Add
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={12}>
              <Popover.Popup className="w-lg origin-[var(--transform-origin)] rounded-lg bg-[canvas] px-6 py-4 text-gray-900 shadow-lg shadow-gray-200 outline-1 outline-gray-200 transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
                <Popover.Arrow className="data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180">
                  <ArrowSvg />
                </Popover.Arrow>
                <Popover.Title className="text-base font-medium">
                  Add Component
                </Popover.Title>
                <div className="mt-6 space-y-4">
                  <ComponentPicker
                    schema={mile.schema}
                    close={() => setOpen(false)}
                    dispatch={dispatch}
                  />
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <div className="divide-y-1 divide-slate-300 border-y border-slate-300">
        {(nodes ?? []).map((e) => {
          return (
            <Layer
              key={e.id}
              node={e}
              mile_schema={mile.schema}
              dispatch={dispatch}
            />
          );
        })}
      </div>
    </div>
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
    editor.performAction(action);
  }

  return (
    <button
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
      className="w-full flex items-center justify-between text-left px-4 py-1 cursor-pointer hover:bg-slate-200 transition-colors"
    >
      <div className="text-sm flex items-center gap-x-1">
        {schema.isMarkdown ? (
          <span className="text-[8px] uppercase px-1 py-0.5 bg-zinc-400/80 rounded-sm text-white font-bold">
            MD
          </span>
        ) : null}
        {schema.title ?? schema.name}
      </div>
      <div
        className=""
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteNode();
        }}
      >
        <TrashIcon size={12} />
      </div>
    </button>
  );
}

function buildNewUserNodePayload(schema: SchemaTypeDefinition) {
  const nodeId = generateId();
  const getInitialNodeData = schema.getInitialNodeData;
  if (!getInitialNodeData) {
    throw new Error(
      `buildNewUserNodePayload: ${schema.type}. "getInitialNodeData" function not found in mile.config.tsx file`,
    );
  }

  return {
    id: "root",
    // add new node to the end of root node
    mode: "last-child",
    nodeId,
    nodes: {
      [nodeId]: getInitialNodeData(nodeId),
    },
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
  const user_schema = schema.user_schema;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
      {user_schema.map((e) => {
        function handleClick() {
          const payload = buildNewUserNodePayload(e);
          editor.perform({
            type: "addNode",
            name: "Add Node",
            payload,
          });
          close();
          dispatch({
            type: AppActionType.SelectNode,
            payload: {
              id: payload.nodeId,
            },
          });
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
  title,
  frameRef,
  iframe_state,
  dispatch_iframe,
}: {
  title?: string;
  frameRef: React.RefObject<IFrame | null>;
  iframe_state: IframeState;
  dispatch_iframe: React.ActionDispatch<[action: IframeAction]>;
}) {
  const editor = useEditor();
  function handleHeaderSavePage() {
    editor.save();
  }

  return (
    <div className="mile-header h-[40px] bg-white" style={{ zIndex: 2 }}>
      <div className="mile-headLeft">
        <a
          href="/mile/pages"
          className="text-sm flex items-center gap-x-1 [&_svg]:text-zinc-400 hover:[&_svg]:text-zinc-900"
        >
          <ChevronLeft size={16} /> Pages
        </a>
        <Divider />
        <button
          onClick={() => {
            editor.undo();
          }}
          className="px-2 py-1.5 flex gap-1 text-xs bg-blue-100 text-blue-800 active:bg-blue-200"
        >
          Undo
        </button>
        <button
          onClick={() => {
            editor.redo();
          }}
          className="px-2 py-1.5 flex gap-1 text-xs bg-blue-100 text-blue-800 active:bg-blue-200"
        >
          Redo
        </button>
        <Divider />
        <div className="flex gap-[1px] bg-white /p-2">
          {/* <button
            type="button"
            className="mile-controls-item w-[26px]"
            onClick={() => {
              if (state.zoom === 1) {
                const thisZoom = 0.5;
                const iframeBodyHeight = getIframeBodyHeight(frameRef.current, thisZoom);
                const iframeWidth = getViewportWidthString();
                dispatch_iframe({
                  type: IframeActionType.SetState,
                  payload: {
                    zoom: thisZoom,
                    pt: HEADER_HEIGHT * 2,
                    h: `${iframeBodyHeight}px`,
                    w: iframeWidth,
                    breakpoint: "desktop",
                  },
                });
                sendMessage({ type: "mile-zoom-changed", payload: thisZoom }, frameRef);
              } else {
                const iframeWidth = getViewportWidthString();
                const iframeBodyHeight = getIframeBodyHeight(frameRef.current, 1);
                dispatch_iframe({
                  type: IframeActionType.SetState,
                  payload: {
                    zoom: 1,
                    pt: HEADER_HEIGHT,
                    h: `${iframeBodyHeight}px`,
                    w: iframeWidth,
                    breakpoint: "desktop",
                  },
                });
                sendMessage({ type: "mile-zoom-changed", payload: 1 }, frameRef);
              }
            }}
          >
            {state.zoom === 1 ? <ZoomOutIcon width={20} height={20} /> : <ZoomInIcon width={20} height={20} />}
          </button> */}
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
            <LaptopIcon width="20" height="20" />
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
            <TabletIcon />
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
            <SmartphoneIcon />
          </button>
        </div>
      </div>
      <MileHeaderPageSettings title={title} />
      <div className="mile-headRight">
        <a
          type="button"
          href="#"
          className="px-2 py-1.5 flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          View <SquareArrowOutUpRight size={10} color="rgba(255,255,255,0.6)" />
        </a>
        <button
          type="button"
          className="px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleHeaderSavePage}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function MileHeaderPageSettings({ title }: { title?: string }) {
  const [localTitle, setLocalTitle] = useState(title);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mile-headCenter">
      <div className="text-sm">{localTitle ?? "Untitled"}</div>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger
          render={() => (
            <button
              onClick={() => {
                setIsOpen(true);
              }}
              className="px-1.5 py-1 select-none flex items-center gap-x-1 text-[10px] font-medium rounded-sm text-white bg-zinc-500 hover:bg-zinc-600 border border-zinc-600"
            >
              <PencilIcon size={8} /> Edit
            </button>
          )}
        />
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup className="fixed top-[40px] bottom-0 /top-1/2 /left-1/2 w-lg max-w-[calc(100vw-3rem)] /-translate-x-1/2 /-translate-y-1/2 /rounded-lg bg-zinc-50 p-6 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 /data-[ending-style]:scale-90 data-[ending-style]:-translate-x-6 data-[ending-style]:opacity-0 /data-[starting-style]:scale-90 data-[starting-style]:-translate-x-6 data-[starting-style]:opacity-0">
            <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium">
              Edit Page Data
            </Dialog.Title>
            <div className="overflow-y-auto h-full">
              <PageSettings
                close={() => {
                  setIsOpen(false);
                }}
                setLocalTitle={setLocalTitle}
              />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function getParentValue(parent?: PageData) {
  if (!parent) return undefined;
  return {
    id: parent.id,
    value: parent.slug,
    label: parent.title ?? "Untitled",
  };
}
function getOwnSlug(page_slug: string, parent: ParentPageValue | undefined) {
  if (parent) {
    if (page_slug.startsWith(parent?.value)) {
      return page_slug.slice(parent.value.length);
    } else {
      return page_slug;
    }
  } else {
    return page_slug;
  }
}

function PageSettings({ close, setLocalTitle }: any) {
  const editor = useEditor();
  const {
    data: parent_page,
    error: parentError,
    isLoading: parentIsLoading,
  } = useSWR(
    editor.page_data.parent_id ? [`/pages/`, editor.page_data.parent_id] : null,
    fetcher,
  );
  if (parentIsLoading) return <div>loading...</div>;
  if (parentError) return <div>error loading parent page data</div>;
  // if (!parent_page) return <div>no parent page data</div>

  return (
    <PageSettingsReady
      parent_page={parent_page}
      close={close}
      setLocalTitle={setLocalTitle}
    />
  );
}

function savePage(id: string, data: { [k: string]: any }) {
  return mutate(
    ["/pages/", id],
    async () => {
      // const resp = await fetch(`${API}/pages`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(data),
      // });
      const resp = await fetch(`${API}/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!resp.ok) {
        const error = new Error("An error occurred while creating the page.");
        const info = await resp.json();
        console.error("Error creating page", info);
        // @ts-expect-error okk
        error.info = info;
        // @ts-expect-error okk
        error.status = resp.status;
        throw error;
      }
      const result = await resp.json();
      return result;
    },
    // { revalidate: false },
  );
}

function buildLocalPageData(
  page_data: PageData,
  parent_page?: PageData,
): LocalPageData {
  console.log("page_data", page_data);

  const { slug, ...rest } = page_data;

  function convertNullToEmptyString(obj: any) {
    return Object.keys(obj).reduce((acc, key) => {
      if (["description", "keywords", "llm", "title"].includes(key)) {
        // @ts-expect-error okk
        acc[key] = obj[key] === null ? "" : obj[key];
      } else {
        // @ts-expect-error okk
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  }

  const parent_value = page_data.parent_id
    ? getParentValue(parent_page)
    : undefined;
  const own_slug = getOwnSlug(page_data.slug, parent_value);

  return {
    ...(convertNullToEmptyString(rest) as Omit<PageData, "slug">),
    own_slug,
    parent: parent_value,
  };
}

function PageSettingsReady({ parent_page, close, setLocalTitle }: any) {
  const editor = useEditor();
  const [pageData, setPageData] = useState<LocalPageData>(() =>
    buildLocalPageData(editor.page_data, parent_page),
  );
  const [error, setError] = useState<string | null>(null);
  // console.log("pageData", pageData);

  function handleTitleChange(event: any) {
    const value = event.target.value;
    setLocalTitle(value);
    setPageData((e) => {
      return { ...e, title: value };
    });
  }
  function handleTypeChange(event: any) {
    const value = event.target.value;
    setPageData((e) => {
      return { ...e, type: value };
    });
  }

  function handleOwnSlugChange(event: any) {
    setPageData((e) => {
      return { ...e, own_slug: event.target.value };
    });
  }

  function handleParentSlugChange(v?: ParentPageValue | null) {
    setPageData((e) => {
      return { ...e, parent: v };
    });
  }

  function handleContentChange(v: string) {
    setPageData((e) => {
      return { ...e, content: v };
    });
  }

  function handleKeywordsChange(v: string) {
    setPageData((e) => {
      return { ...e, keywords: v };
    });
  }

  function handleMetaDescriptionChange(v: string) {
    setPageData((e) => {
      return { ...e, description: v };
    });
  }

  function handleOgImageIdChange(v: string) {
    // support 1 image for now
    setPageData((e) => {
      return { ...e, og_image_ids: [v] };
    });
  }

  function handleNoIndexChange(v: boolean) {
    setPageData((e) => {
      return { ...e, no_index: v === true ? 1 : 0 };
    });
  }

  function handleAutoSlug() {
    setPageData((e) => {
      if (!e.title) {
        return e;
      }
      return { ...e, own_slug: `/${slugify(e.title)}` };
    });
  }

  async function handleSavePage() {
    // const pageId = generateId();
    // validate
    if (pageData.title === "") {
      setError("Title is required.");
      return;
    }
    if (pageData.own_slug === "") {
      setError("Slug is required.");
      return;
    }
    if (pageData.own_slug !== "/" && pageData.own_slug.at(0) !== "/") {
      setError("Slug must start with slash e.g. /good-slug");
      return;
    }
    if (pageData.own_slug !== "/" && pageData.own_slug.slice(-1) === "/") {
      setError("Slug cannot end with slash e.g. /bad-slug/");
      return;
    }
    setError(null);
    function buildPageSlug(data: LocalPageData) {
      return data.parent
        ? `${data.parent.value === "/" ? "" : data.parent.value}${data.own_slug}`
        : data.own_slug;
    }
    function buildPageParentId(data: LocalPageData) {
      if (data.parent) {
        if (data.parent.value === "/" || data.parent.value === "") {
          return undefined;
        }
        return data.parent.id;
      }
      return undefined;
    }
    const payload = {
      // id: pageId,
      title: pageData.title?.trim(),
      slug: buildPageSlug(pageData),
      parent_id: buildPageParentId(pageData),
      content: pageData.content as string,
      description: pageData.description,
      keywords: pageData.keywords,
      og_image_ids: pageData.og_image_ids,
      no_index: pageData.no_index,
      // llm
      // no_follow
    };
    console.log("payload", payload);
    await savePage(editor.page_data.id, payload)
      .then((e) => {
        console.log("e", e);
        close();
        window.location.reload();
      })
      .catch((e) => {
        let message = e.info?.message
          ? `${e.message} ${e.info.message}`
          : e.message;
        setError(message);
      });
  }

  return (
    <div className="flex flex-col py-8 /h-full">
      <div className="space-y-4">
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="title" className="font-semibold text-sm">
              Title
            </label>
            <Input
              id="title"
              value={pageData.title}
              onChange={handleTitleChange}
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
              value={pageData.type}
              onChange={handleTypeChange}
              placeholder="e.g. page or post"
            />
            <div className="mt-1 text-xs text-zinc-600">"page" or "post"</div>
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full relative">
            <SlugInput
              pageData={pageData}
              handleParentSlugChange={handleParentSlugChange}
              handleOwnSlugChange={handleOwnSlugChange}
              hideCurrentPageInParentPicker={true}
            />
            <div className="absolute right-0 -top-1.5">
              <button
                type="button"
                onClick={() => {
                  handleAutoSlug();
                }}
                className="text-xs leading-none px-2 py-1 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200/70 text-zinc-600 hover:text-zinc-900 rounded"
              >
                Auto
              </button>
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="metadescription" className="font-semibold text-sm">
              Meta Description
            </label>
            <Field.Control
              id="metadescription"
              value={pageData.description}
              onValueChange={handleMetaDescriptionChange}
              render={<textarea rows={4} className={textareaClasses} />}
            />
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label className="font-semibold text-sm">Open graph Image</label>
            <PageOpenGraphImage
              image_id={
                pageData.og_image_ids.length > 0
                  ? pageData.og_image_ids[0]
                  : undefined
              }
              onImageIdChange={handleOgImageIdChange}
            />
            <div className="mt-1 text-xs text-zinc-600">
              Used in social media preview
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label htmlFor="keywords" className="font-semibold text-sm">
              Keywords
            </label>
            <Field.Control
              id="keywords"
              value={pageData.keywords}
              onValueChange={handleKeywordsChange}
              render={<textarea rows={4} className={textareaClasses} />}
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
              value={pageData.content as string}
              onValueChange={handleContentChange}
              render={<textarea rows={4} className={textareaClasses} />}
            />
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-y-4">
          <div className="w-full">
            <label className="font-semibold text-sm flex flex-row items-center gap-x-2">
              Do not index page
              <Switch.Root
                checked={Boolean(pageData.no_index)}
                onCheckedChange={handleNoIndexChange}
                className="relative flex h-6 w-10 rounded-full bg-gradient-to-r from-gray-700 from-35% to-gray-200 to-65% bg-[length:6.5rem_100%] bg-[100%_0%] bg-no-repeat p-px shadow-[inset_0_1.5px_2px] shadow-gray-200 outline outline-1 -outline-offset-1 outline-gray-200 transition-[background-position,box-shadow] duration-[125ms] ease-[cubic-bezier(0.26,0.75,0.38,0.45)] before:absolute before:rounded-full before:outline-offset-2 before:outline-blue-800 focus-visible:before:inset-0 focus-visible:before:outline focus-visible:before:outline-2 active:bg-gray-100 data-[checked]:bg-[0%_0%] data-[checked]:active:bg-gray-500 dark:from-gray-500 dark:shadow-black/75 dark:outline-white/15 dark:data-[checked]:shadow-none"
              >
                <Switch.Thumb className="aspect-square h-full rounded-full bg-white shadow-[0_0_1px_1px,0_1px_1px,1px_2px_4px_-1px] shadow-gray-100 transition-transform duration-150 data-[checked]:translate-x-4 dark:shadow-black/25" />
              </Switch.Root>
            </label>
            <div className="mt-1 text-xs text-zinc-600">
              {Boolean(pageData.no_index) ? (
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
        <Button
          onClick={handleSavePage}
          className="w-full py-3 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          Save
        </Button>
      </div>
    </div>
  );
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
      const resp = await fetch(`${API}/medias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            id: generateId(),
            type: upload.file.type,
            size: upload.file.size,
            filepath: upload.file.objectKey,
            width: upload.file.width,
            height: upload.file.height,
          },
        ]),
      });
      if (!resp.ok) {
        const error = new Error("An error occurred while saving the images.");
        const info = await resp.json();
        console.error("Error saving images", info);
        // @ts-expect-error okk
        error.info = info;
        // @ts-expect-error okk
        error.status = resp.status;
        throw error;
      }
      const res = await resp.json();
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
        <ImageGallery
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
  // save db
  const payload = upload.files.map((e: any) => {
    return {
      id: generateId(),
      type: e.type,
      size: e.size,
      width: e.width,
      height: e.height,
      filepath: e.objectKey,
    };
  });
  mutate(`/medias`, async (prev: any) => {
    const resp = await fetch(`${API}/medias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const error = new Error("An error occurred while saving the images.");
      const info = await resp.json();
      console.error("Error saving images", info);
      // @ts-expect-error okk
      error.info = info;
      // @ts-expect-error okk
      error.status = resp.status;
      throw error;
    }
    const res = await resp.json();
    return prev ? [...prev, ...res] : res;
  });
}

function ImageGallery({
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
  const [selectedFileId, setSelectedFileId] = useState(initialSelectedFileId);
  const [isPending, setIsPending] = useState(false);
  const { data, isValidating } = useMediaFile(selectedFileId);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button disabled={is_disabled} className="cursor-pointer">
            <ImagesIcon /> Gallery
          </Button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="flex flex-col justify-between fixed top-[calc(50%+20px)] left-1/2 w-full max-w-[calc(100vw-3rem)] h-full max-h-6/7 -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl bg-gray-50 outline-1 outline-gray-400 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <div className="py-2 px-3 flex items-center justify-between">
            <div className="flex items-center gap-x-4">
              <Dialog.Title className="text-lg font-medium">
                Gallery
              </Dialog.Title>
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
          <div className="px-3 grid grid-cols-[1fr_300px] gap-2 grow overflow-hidden">
            <div className="/pt-4 pb-8 overflow-y-auto">
              <MediaFiles
                selectedFileId={selectedFileId}
                handleSelectFile={setSelectedFileId}
              />
            </div>
            <div className="overflow-y-auto pt-4 pb-8 px-4 bg-gray-100">
              <MediaMetadata
                selectedFileId={selectedFileId}
                setIsPending={setIsPending}
              />
            </div>
          </div>
          <div className="py-2 px-3 bg-zinc-200 rounded-b-lg flex justify-end">
            <button
              disabled={isPending || isValidating}
              onClick={() => {
                if (selectedFileId) {
                  handleConfirmFile(selectedFileId, data);
                }
              }}
              className="mr-2 my-1 py-2 px-3 rounded-md bg-blue-600 text-xs text-white hover:bg-blue-700 transition-colors cursor-default disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function fetchStringKey(key: string) {
  return fetch(`${API}${key}`).then((r) => r.json());
}

function useMediaFiles() {
  return useSWR(`/medias`, fetchStringKey);
}

function MediaFiles({
  selectedFileId,
  handleSelectFile,
}: {
  selectedFileId?: string;
  handleSelectFile: (fileId: string) => void;
}) {
  const { data, error, isLoading } = useMediaFiles();
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;
  // console.log('data', data);
  return (
    <div className="">
      <MediaFilesGrid
        data={data}
        selectedFileId={selectedFileId}
        handleSelectFile={handleSelectFile}
      />
    </div>
  );
}

function MediaFilesGrid({
  data,
  selectedFileId,
  handleSelectFile,
}: {
  data: any[];
  selectedFileId?: string;
  handleSelectFile: (fileId: string) => void;
}) {
  if (!data || data.length === 0) {
    return <div className="">No files</div>;
  }
  return (
    <div className="grid grid-cols-4 gap-4 items-start">
      {data.map((e: any) => (
        <MediaFileCard
          data={e}
          key={e.id}
          selectedFileId={selectedFileId}
          handleSelectFile={handleSelectFile}
        />
      ))}
    </div>
  );
}

function getImageUrl(key: string) {
  return `${NEXT_PUBLIC_IMAGE_URL}/${key}`;
}

function getFileName(filepath: string) {
  return filepath.split("/").at(-1) ?? "Unknown name";
}

function MediaFileCard({
  data,
  selectedFileId,
  handleSelectFile,
}: {
  data: any;
  selectedFileId?: string;
  handleSelectFile: (fileId: string) => void;
}) {
  return (
    <button
      className={`bg-white flex w-full flex-col border ${selectedFileId === data.id ? "border-zinc-500" : "border-zinc-300"} hover:border-zinc-400`}
      onClick={() => {
        handleSelectFile(data.id);
      }}
    >
      <div
        className={`py-5 ${selectedFileId === data.id ? "bg-blue-100" : "bg-zinc-100"} h-[180px] flex justify-center`}
      >
        <img
          src={getImageUrl(data.filepath)}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="px-2 py-2">
        <div className="text-sm leading-4 select-text">
          {getFileName(data.filepath)}
        </div>
      </div>
    </button>
  );
}

function useMediaFile(media_id?: string) {
  return useSWR(media_id ? `/medias/${media_id}` : null, fetchStringKey);
}

function MediaMetadata({
  selectedFileId,
  setIsPending,
}: {
  selectedFileId?: string;
  setIsPending: (v: boolean) => void;
}) {
  const { data, error, isLoading, isValidating } = useMediaFile(selectedFileId);
  if (error || data?.error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  if (!data) return null;
  if (data.type == null) {
    return (
      <div className="">
        <h2 className="mb-4">Media details</h2>
        <div className="mb-4 text-xs">
          <h3 className="mb-1 font-medium">Unknown media file type.</h3>
        </div>
      </div>
    );
  }
  if (selectedFileId) {
    if (data.type.startsWith("image/")) {
      return (
        <ImageDetails
          selectedFileId={selectedFileId}
          data={data}
          setIsPending={setIsPending}
        />
      );
    }
  }

  return null;
}

function ImageDetails({
  selectedFileId,
  data,
  setIsPending,
}: {
  selectedFileId: string;
  data: any;
  setIsPending: (v: boolean) => void;
}) {
  return (
    <div className="">
      <h2 className="mb-4 font-semibold">Media details</h2>

      <div className="mb-4 grid grid-cols-[112px_1fr] gap-x-3">
        <div className="mb-2">
          <img src={getImageUrl(data.filepath)} alt="" />
        </div>
        <div className="mb-4 text-xs">
          <h3 className="mb-1.5 font-medium">{data.filepath}</h3>
          <div className="mb-0.5">{filesize(data.size)}</div>
          <div className="text-gray-500">
            {new Date(data.created_at).toString()}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-y-3">
        <div className="">
          <TextAreaImageAltText
            key={`alt_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.alt}
            setIsPending={setIsPending}
          />
        </div>
        <div className="">
          <InputImageTitle
            key={`title_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.title ?? getFileName(data.filepath)}
            setIsPending={setIsPending}
          />
        </div>
        <div className="">
          <TextAreaImageCaption
            key={`caption_${selectedFileId}`}
            fileId={data.id}
            defaultValue={data.caption}
            setIsPending={setIsPending}
          />
        </div>
        <div className="">
          <ImageURL defaultValue={getImageUrl(data.filepath)} />
        </div>
      </div>
    </div>
  );
}

function ImageURL({ defaultValue }: any) {
  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        File url
      </label>
      <Input readOnly defaultValue={defaultValue} className="truncate" />
    </div>
  );
}

function TextAreaImageCaption({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState("");
  function handleBlur() {
    if (isDirty) {
      updateFileMetadata(fileId, { caption: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(v: string) {
    setValue(v);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Caption
      </label>
      <Field.Control
        defaultValue={defaultValue ?? undefined}
        onBlur={handleBlur}
        onValueChange={handleChange}
        render={<textarea rows={4} className={textareaClasses} />}
      />
    </div>
  );
}

const textareaClasses =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-zinc-300 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-zinc-500 focus-visible:inset-ring-2 focus-visible:inset-ring-zinc-200 focus-visible:shadow-md aria-invalid:ring-destructive/20 aria-invalid:border-destructive";

function InputImageTitle({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState("");
  function handleBlur() {
    if (isDirty) {
      updateFileMetadata(fileId, { title: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(e: any) {
    setValue(e.target.value);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Title
      </label>
      <Input
        defaultValue={defaultValue ?? undefined}
        onBlur={handleBlur}
        onChange={handleChange}
        className="truncate"
      />
    </div>
  );
}

function TextAreaImageAltText({
  fileId,
  defaultValue,
  setIsPending,
}: {
  fileId: string;
  defaultValue: string | null;
  setIsPending: (v: boolean) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  function handleBlur() {
    if (isDirty) {
      setIsPending(true);
      updateFileMetadata(fileId, { alt: value }, () => setIsPending(false));
      setIsDirty(false);
    }
  }
  function handleChange(v: string) {
    setValue(v);
    if (!isDirty) {
      setIsDirty(true);
    }
  }
  return (
    <div className="flex flex-col">
      <label htmlFor="" className="mb-1 text-xs font-semibold">
        Alt text
      </label>
      <Field.Control
        value={value}
        onBlur={handleBlur}
        onValueChange={handleChange}
        render={<textarea rows={4} className={textareaClasses} />}
      />
      {/* <Button onClick={() => { }} className="text-xs">
        Fill it
      </Button> */}
    </div>
  );
}

function updateFileMetadata(
  file_id: string,
  data: { [k: string]: string },
  done: () => void,
) {
  updateMediaMetadata(`${API}/medias/${file_id}`, data)
    .then((e) => {
      mutate((k: string) => k === `/medias/${file_id}` || k === "/medias");
      done();
    })
    .catch((e) => {
      console.error("error", e);
      done();
    });
}

async function updateMediaMetadata(url: string, data: { [k: string]: string }) {
  return await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

function ArrowSvg(props: React.ComponentProps<"svg">) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-[canvas]"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-gray-200"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className=""
      />
    </svg>
  );
}

const markdownTags = [
  "heading",
  "paragraph",
  "list",
  "listItem",
  "text",
  "inlineCode",
  "code",
  "strong",
  "emphasis",
  "blockquote",
  "link",
  "image",
  "thematicBreak",
  "html",
  "break",
  "delete",
  "footnoteDefinition",
  "footnoteReference",
  "definition",
  "imageReference",
  "linkReference",
  "table",
  "tableRow",
  "tableCell",
];

function isMarkdown(type: string) {
  return markdownTags.includes(type);
}
