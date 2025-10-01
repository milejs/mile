import "../mile.css";

import { use, useEffect, useMemo, useReducer, useRef, useState, SetStateAction, useCallback } from "react";
import { FieldDefinition, MileEditor, NodeData, Operation, PageData, RouterLike, Schema, SchemaTypeDefinition, TreeData } from "@milejs/types";
import { tinykeys } from "@/lib/tinykeys";
import { flushSync } from "react-dom";
import { ChevronLeft, ChevronRight, LaptopIcon, PencilIcon, SmartphoneIcon, SquareArrowOutUpRight, TabletIcon, Trash2Icon, TrashIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { invariant } from "@/lib/invariant";
import { Preview } from "./preview";
import { createChannel } from "bidc";
import { useMileProvider } from "./client";
import { Tree } from "./tree";
import { EditorProvider, useEditor } from "./editor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dashboard } from "./dashboard";

const HEADER_HEIGHT = 40;
const NEXT_PUBLIC_HOST_URL = process.env.NEXT_PUBLIC_HOST_URL;

const resolvePath = (paths: string[] = []) => {
  const hasPath = paths.length > 0;
  const isEdit = hasPath ? paths[paths.length - 1] === "edit" : false;
  const isIframeContent = hasPath ? paths[paths.length - 1] === "__iframe_content__" : false;
  return {
    isEdit,
    isIframeContent,
    path: `/${(isEdit || isIframeContent ? [...paths].slice(0, paths.length - 1) : [...paths]).join("/")}`,
  };
};

export function Mile({
  params,
  searchParams,
  router,
  data: page_data,
}: {
  params: Promise<{ milePath?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  router: RouterLike;
  data: PageData;
}) {
  const mile = useMileProvider();
  const { milePath } = use(params);
  const search = use(searchParams);
  const { isEdit, isIframeContent, path } = resolvePath(milePath);
  // const page_data: PageData = getData();
  console.log({ isEdit, isIframeContent, path });
  const tree = useMemo(() => {
    if (page_data) {
      if (typeof page_data.content === "string") {
        return new Tree(JSON.parse(page_data.content));
      }
    }
    if (typeof page_data.content !== "string") {
      return new Tree(page_data.content ?? {});
    }
    return new Tree({});
  }, [path]);
  const [data, setData] = useState<TreeData | undefined>(() => tree?.data);
  const [lastOperation, setLastOperation] = useState<Operation | null>(null);
  //
  const frameRef = useRef<IFrame | null>(null);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  useEffect(() => {
    if (!frameRef.current) return
    if (!frameRef.current.contentWindow) return

    // Create channel for parent->iframe communication
    const channel = createChannel(frameRef.current.contentWindow);
    channelRef.current = channel;

    const timeout = setTimeout(async () => {
      await channel.receive((data) => {
        console.log('receive data', data);
      });
    }, 500);

    return () => {
      clearTimeout(timeout);
      channel.cleanup();
    }
  }, []);

  const setDataAndSend = useCallback(function setDataAndSend(value: SetStateAction<TreeData | undefined>) {
    if (!value) {
      console.log('no data');
      return;
    }
    setData(value);
    channelRef.current?.send({
      kind: "update_data",
      data: value,
    });
  }, []);

  if (isEdit) {
    return (
      <EditorProvider tree={tree} setData={setDataAndSend} setLastOperation={setLastOperation}>
        <MileFrame
          title={page_data.title}
          data={data}
          router={router}
          frameRef={frameRef}
          iframeSrc={`${process.env.NEXT_PUBLIC_HOST_URL}/mile${path === "/" ? "" : path}/__iframe_content__`}
        />
      </EditorProvider>
    );
  }

  if (isIframeContent) {
    return <Preview slug={path} data={data} />;
  }

  return <Dashboard config={mile.config} path={path} search={search} />;
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
  contentWindow:
  | Window
  | null
  | undefined;
};
// type IFrame = HTMLIFrameElement & {
//   contentWindow:
//   | (Window & {
//     __mile_messenger__: MileMessenger;
//   })
//   | null
//   | undefined;
// };

export function MileFrame({ data, iframeSrc, frameRef, title, router }: { frameRef: React.RefObject<IFrame | null>; data: TreeData | undefined, title?: string; iframeSrc: string; router: RouterLike }) {
  // useEffect(() => {
  //   function handleMessage(event: MessageEvent) {
  //     if (event.origin !== NEXT_PUBLIC_HOST_URL) {
  //       return; // Ignore messages from other origins
  //     }
  //     let { type, payload } = event.data;
  //     if (type === "http-redirect") {
  //       window.location.href = payload;
  //       return;
  //     }
  //   }
  //   window.addEventListener("message", handleMessage);
  //   return () => {
  //     window.removeEventListener("message", handleMessage);
  //   };
  // }, []);
  const editor = useEditor();
  console.log('MileFrame editor:', editor);

  useEffect(() => {
    let unsubscribe = tinykeys(window, {
      "$mod+S": (e: Event) => {
        e.preventDefault();
        sendMessage({ type: "mile_save_page" }, frameRef);
      },
      "$mod+Z": (e: Event) => {
        e.preventDefault();
        sendMessage({ type: "mile_undo" }, frameRef);
      },
      "$mod+Y": (e: Event) => {
        e.preventDefault();
        sendMessage({ type: "mile_redo" }, frameRef);
      },
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const [state, dispatch] = useReducer(iframeReducer, initialIframeState);

  return (
    <div className="flex flex-col h-screen">
      <MileHeader title={title} frameRef={frameRef} state={state} dispatch={dispatch} />
      <MileContent data={data} iframeSrc={iframeSrc} frameRef={frameRef} state={state} dispatch={dispatch} />
      {/* <SettingsModal frameRef={frameRef} />
      <Library frameRef={frameRef} /> */}
    </div>
  );
}

function MileContent({
  iframeSrc,
  frameRef,
  state,
  dispatch,
  data,
}: {
  iframeSrc: string;
  frameRef: React.RefObject<IFrame | null>;
  state: IframeState;
  dispatch: React.ActionDispatch<[action: IframeAction]>;
  data: TreeData | undefined;
}) {
  const { zoom, pt, w, h } = state;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const iframeBodyHeight = window.innerHeight - HEADER_HEIGHT;
    dispatch({ type: IframeActionType.SetWidthHeight, payload: { w: `100%`, h: `${iframeBodyHeight}px` } });
  }, []);

  useEffect(() => {
    function handleResize() {
      const iframeBodyHeight = window.innerHeight - HEADER_HEIGHT;
      dispatch({ type: IframeActionType.SetWidthHeight, payload: { w: `100%`, h: `${iframeBodyHeight}px` } });
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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
          dispatch({ type: IframeActionType.SetHeight, payload: `${viewportHeight}px` });
        });
        if (frameRef.current?.contentDocument) {
          frameRef.current.contentDocument.documentElement.scrollTop = scrollPosition;
        }
        return;
      }
      if (type === "drag-ended") {
        const scrollPosition = frameRef.current?.contentDocument?.documentElement.scrollTop;
        invariant(scrollPosition != null);
        const iframeBodyHeight = getIframeBodyHeight(frameRef.current, zoom);
        flushSync(() => {
          dispatch({ type: IframeActionType.SetHeight, payload: `${iframeBodyHeight}px` });
        });
        document.body.scrollTop = scrollPosition * zoom;
        return;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [frameRef, zoom, dispatch]);

  function toggleSidebar() {
    setIsOpen(s => !s);
  }

  return (
    <div className="flex grow h-(--h) mt-[40px]" style={{ ["--h" as string]: `${h}` }}>
      <PanelGroup direction="horizontal" autoSaveId="mile-editor" className="relative">
        {/* artboard starts */}
        <Panel minSize={30}>
          <div className="artboard-inner h-full overflow-y-auto">
            <div className="">
              <div className="mile-canvas-root">
                <iframe
                  ref={frameRef}
                  id="mileframe"
                  src={iframeSrc}
                  title="mileframe"
                  className="mile-iframe"
                  style={{ width: w, height: h, margin: "0 auto" }}
                />
              </div>
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-[2px] bg-blue-200 hover:bg-blue-400" />
        {isOpen && <Panel defaultSize={20} minSize={15} maxSize={45} className="bg-slate-100">
          <div className="h-full overflow-y-auto">
            <Layers data={data} />
          </div>
        </Panel>}
        <div className="absolute right-1 top-1">
          <button
            className="size-5 rounded-md border border-slate-400 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center"
            onClick={() => toggleSidebar()}
          >
            {isOpen ? <ChevronRight color="black" size={14} /> : <ChevronLeft color="black" size={14} />}
          </button>
        </div>
        {/* artboard ends */}

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

function getSchemaMap(schema: Schema): Record<string, SchemaTypeDefinition> {
  const typeMap: Record<string, SchemaTypeDefinition> = {};

  for (const entry of schema) {
    if (!(entry.type in typeMap)) {
      typeMap[entry.type] = entry;
    }
  }

  return typeMap;
}

function Layer({ item, schemaMap, setActiveItem }: { item: NodeData; schemaMap: Record<string, SchemaTypeDefinition>; setActiveItem: (id: string) => void; }) {
  const editor = useEditor();
  // console.log('layer', schemaMap[item.type], item);
  const schema = schemaMap[item.type];
  async function handleDeleteNode() {
    const action = {
      type: "deleteNode",
      name: "Delete node",
      payload: { id: item.id },
    };
    editor.performAction(action);
    // await channelRef.current?.send({
    //   kind: "update_data",
    //   data: editor.tree.data,
    // });
  }

  return (
    <button
      onClick={() => {
        setActiveItem(item.id);
      }}
      className="w-full flex items-center justify-between text-left px-4 py-1 cursor-pointer hover:bg-slate-200 transition-colors"
    >
      <div className="text-sm">{schema.title ?? schema.name}</div>
      <div
        className=""
        onClick={async (e) => {
          e.stopPropagation();
          await handleDeleteNode();
        }}
      >
        <TrashIcon size={12} />
      </div>
    </button>
  )
}

const primitiveTypes = ["string", "number", "boolean", "url", "date", "richtext"];

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
    case "date":
      return EditDateComponent;
    case "richtext":
      return EditRichtextComponent;
    default:
      throw new Error(`Unsupported primitive component: ${type}`)
  }
}

type EditComponentProps = {
  editor: MileEditor;
  node: NodeData;
  path: string[];
  state: any;
  handleChange: (path: string[], v: any) => void;
  field: FieldDefinition;
  schemaMap: Record<string, SchemaTypeDefinition>;
}

function EditRichtextComponent({ editor, node, field, schemaMap }: EditComponentProps) {
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <textarea />
    </div>
  )
}

function EditDateComponent({ editor, node, field, schemaMap }: EditComponentProps) {
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <input type="date" />
    </div>
  )
}

function EditUrlComponent({ node, path, state, handleChange, field, schemaMap }: EditComponentProps) {
  const value = getFieldValue(state, path);
  function handleInputChange(e: any) {
    handleChange(path, e.target.value);
  }
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input type="text" className="border" value={value} onChange={handleInputChange} />
    </div>
  )
}

function EditBooleanComponent({ node, path, state, handleChange, field, schemaMap }: EditComponentProps) {
  const value = getFieldValue(state, path);
  function handleInputChange(e: boolean | 'indeterminate') {
    handleChange(path, e);
  }
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold flex items-center gap-x-2">
        {field.title}
        <Checkbox checked={value} onCheckedChange={handleInputChange} />
      </label>
    </div>
  )
}

function EditNumberComponent({ editor, node, field, schemaMap }: EditComponentProps) {
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input type="text" />
    </div>
  )
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

function EditStringComponent({ node, path, state, handleChange, field, schemaMap }: EditComponentProps) {
  const value = getFieldValue(state, path);
  function handleInputChange(e: any) {
    handleChange(path, e.target.value);
  }
  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-sm font-semibold">{field.title}</label>
      <Input type="text" className="border" value={value} onChange={handleInputChange} />
    </div>
  )
}

/*************************************************************
 * Start: Edit Component Update State
 */
function createInitialValue(current: unknown, field: any, schemaMap: Record<string, SchemaTypeDefinition> = {}) {
  if (current) {
    return current;
  }
  return createInitialEmptyValue(field, schemaMap);
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
    case "richtext":
      return "";
    case "date":
      return new Date();
    default:
      return null;
  }
}

function initializeFields(fields: any, schemaMap: Record<string, SchemaTypeDefinition> = {}): Record<string, any> {
  console.log('initializeFields', fields, schemaMap);
  return fields.reduce(
    (acc: Record<string, any>, field: any) => {
      const isPrimitive = isPrimitiveType(field.type);
      if (isPrimitive) {
        acc[field.name] = getDefaultValueForType(field.type);
      } else {
        const f = schemaMap[field.type];
        acc[field.name] = initializeFields(f.fields, schemaMap);
      }
      return acc;
    },
    {} as Record<string, any>,
  );
}

function createInitialEmptyValue(field: any, schemaMap: Record<string, SchemaTypeDefinition> = {}) {
  const initialFields = field.fields ? initializeFields(field.fields, schemaMap) : getDefaultValueForType(field.type);
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
) {
  if (state == null) {
    const initializeState = createInitialValue(state, field);
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
      [breakpoint]: updateNestedStateRec(state[breakpoint], path, value, field, breakpoint),
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
  console.log('state', state);
  if (path.length === 0) {
    return value;
  }
  invariant(typeof state !== "string" && typeof state !== "number" && typeof state !== "boolean");
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

function EditPrimitiveField({ node, path, state, handleChange, field, schemaMap }: { node: NodeData; path: string[]; state: any; handleChange: (path: string[], v: any) => void; field: FieldDefinition; schemaMap: Record<string, SchemaTypeDefinition> }) {
  const editor = useEditor();
  const EditComponent = getPrimitiveComponent(field.type);
  return <EditComponent editor={editor} node={node} path={path} state={state} handleChange={handleChange} field={field} schemaMap={schemaMap} />
}

function EditField({ node, path, state, handleChange, field, schemaMap }: { node: NodeData; path: string[]; state: any; handleChange: (path: string[], v: any) => void; field: FieldDefinition; schemaMap: Record<string, SchemaTypeDefinition> }) {
  console.log('EditField', path, field.type, state);
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
        schemaMap={schemaMap}
      />
    )
  }

  const schema = schemaMap[type];
  if (!schema || !schema.fields) {
    console.log('not schema', type);
    return null;
  }

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
        schemaMap={schemaMap}
      />
    </div>
  )
}

function EditFields({ node, path, state, handleChange, fields, schemaMap }: { node: NodeData; path: string[]; state: any; handleChange: (path: string[], v: any) => void; fields: FieldDefinition[]; schemaMap: Record<string, SchemaTypeDefinition> }) {
  // console.log('EditFields', path);
  if (!fields) {
    return (
      <div className="">
        No fields defined in schema
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {fields.map(e => {
        return (
          <EditField
            key={e.name}
            node={node}
            path={e.name ? path.concat(e.name) : path}
            state={state}
            handleChange={handleChange}
            field={e}
            schemaMap={schemaMap}
          />
        )
      })}
    </div>
  )
}
/**
 * 
 const editor = useEditor();
  const treenode = editor.getNode(node.id);
  const optionValue = treenode.options[field.name ?? ""]; // undefined or option value
  const [initialValue] = useState(() => createInitialValue(optionValue, field));
  const [state, setState] = useState(() => createInitialValue(optionValue, field));
  console.log("state", node.id, path, editor, field.name, optionValue, state, editor.breakpoint);
  const handleChange = (e: any) => {
    // if (isSettingDirty && isSettingDirty.current === false) {
    //   isSettingDirty.current = true;
    // }
    // console.log("update----", state, path, v, field, editor.breakpoint);
    const value = updateState(state, path.length === 1 ? [] : path.slice(0, -1), e.target.value, field, editor.breakpoint);
    editor.perform({
      type: "updateNodeOption",
      name: `Update node option (${field.name})`,
      payload: { nodeId: node.id, optionName: field.name, value, initialValue },
    });
    setState(value);
  };
 */
function EditNode({ node, schemaMap }: { node: NodeData; schemaMap: Record<string, SchemaTypeDefinition> }) {
  const editor = useEditor();
  const schema = schemaMap[node.type];
  invariant(schema.name);
  if (!schema.fields) {
    console.log('no fields');
    return null;
  }
  console.log('EditNode', node, schema, schemaMap);

  const treenode = editor.getNode(node.id);
  const optionValue = treenode.options; // undefined or option value
  console.log('EditNode optionValue', optionValue);

  const [initialValue] = useState(() => createInitialValue(optionValue, schema, schemaMap));
  const [state, setState] = useState(() => createInitialValue(optionValue, schema, schemaMap));
  console.log("root state", node.id, schema.name, state);
  const handleChange = (path: string[], v: any) => {
    // if (isSettingDirty && isSettingDirty.current === false) {
    //   isSettingDirty.current = true;
    // }
    console.log("update----", state, path, v, schema, editor.breakpoint);
    const value = updateState(state, path, v, schema, editor.breakpoint);
    editor.perform({
      type: "updateNodeOption",
      name: `Update node option (${schema.name})`,
      payload: { nodeId: treenode.id, value, initialValue },
    });
    setState(value);
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
        schemaMap={schemaMap}
      />
    </div>
  )
}

function Layers({ data }: { data: TreeData | undefined; }) {
  const mile = useMileProvider();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const schemaMap = useMemo(() => getSchemaMap(mile.config.schema!), [mile.config.schema])
  function handleBackClick() {
    setActiveItem(null);
  }

  if (!data) return null;
  if (!mile.config.schema) {
    throw new Error("Schema not found");
  }

  const layers = data.root.children?.map(e => {
    return data[e];
  });
  if (!layers) return null;

  if (activeItem !== null) {
    const node = data[activeItem];
    return (
      <div className="py-4">
        <button onClick={handleBackClick} className="ml-4 pl-2 pr-3 py-1 flex items-center gap-x-1 bg-slate-600 hover:bg-slate-700 transition-colors rounded-full text-white text-[10px] uppercase tracking-wider">
          <ChevronLeft size={12} />Back
        </button>
        <div className="mt-4 px-4">
          <EditNode node={node} schemaMap={schemaMap} />
        </div>
      </div>
    )
  }

  return (
    <div className="py-4">
      <h3 className="mb-2 px-4 text-[10px] uppercase tracking-wider">Layers</h3>
      <div className="divide-y-1 divide-slate-300 border-y border-slate-300">
        {layers.map(e => {
          return (
            <Layer key={e.id} item={e} schemaMap={schemaMap} setActiveItem={setActiveItem} />
          )
        })}
      </div>
    </div>
  )
}

function getIframeBodyHeight(iframe: HTMLIFrameElement | null, zoom: number) {
  if (!iframe) {
    throw new Error("Iframe is unavailable");
  }
  const scrollHeight = iframe.contentDocument?.body.scrollHeight;
  const offsetHeight = iframe.contentDocument?.body.offsetHeight;
  console.log('scrollHeight', scrollHeight);
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
  state,
  dispatch,
}: {
  title?: string;
  frameRef: React.RefObject<IFrame | null>;
  state: IframeState;
  dispatch: React.ActionDispatch<[action: IframeAction]>;
}) {
  const editor = useEditor();
  function handleSavePage() {
    sendMessage({ type: "mile_save_page" }, frameRef);
  }

  function handleEditPageData() {
    sendMessage({ type: "mile_edit_page_data" }, frameRef);
  }

  return (
    <div className="mile-header h-[40px] bg-white" style={{ zIndex: 2 }}>
      <div className="mile-headLeft">
        <a href="/mile/dashboard">Dashboard</a>
        <Divider />
        <button
          onClick={() => {
            getEditor(frameRef)?.undo();
          }}
          className="px-2 py-1.5 flex gap-1 text-xs bg-blue-100 text-blue-800 active:bg-blue-200"
        >
          Undo
        </button>
        <button
          onClick={() => {
            getEditor(frameRef)?.redo();
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
                dispatch({
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
                dispatch({
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
            className={`mile-controls-item w-[26px] ${state.breakpoint === "desktop" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch({
                  type: IframeActionType.SetBreakpointDesktop,
                  payload: { w: getViewportWidthString() },
                });
              });
              const iframeBodyHeight = getIframeBodyHeight(frameRef.current, state.zoom);
              dispatch({
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
            className={`mile-controls-item w-[26px] ${state.breakpoint === "tablet" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch({
                  type: IframeActionType.SetBreakpointTablet,
                  payload: { w: "768px" },
                });
                editor.setBreakpoint("tablet");
              });
              // const iframeBodyHeight = getIframeBodyHeight(frameRef.current, state.zoom);
              // dispatch({
              //   type: IframeActionType.SetHeight,
              //   payload: `${iframeBodyHeight}px`,
              // });

            }}
          >
            <TabletIcon />
          </button>
          <button
            type="button"
            className={`mile-controls-item w-[26px] ${state.breakpoint === "mobile" ? "bg-indigo-100" : ""}`}
            onClick={() => {
              flushSync(() => {
                dispatch({
                  type: IframeActionType.SetBreakpointMobile,
                  payload: { w: "390px" },
                });
              });
              const iframeBodyHeight = getIframeBodyHeight(frameRef.current, state.zoom);
              dispatch({
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
      <div className="mile-headCenter">
        <div className="">{title ?? "Untitled"}</div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleEditPageData}
            className="px-1 py-0.5 rounded-md cursor-default bg-gray-100 hover:bg-gray-300"
          >
            <PencilIcon width={12} />
          </button>
        </div>
      </div>
      <div className="mile-headRight">
        <a
          type="button"
          href="#"
          className="px-2 py-1.5 flex items-center gap-1 text-xs bg-blue-600 text-white"
        >
          View <SquareArrowOutUpRight size={10} color="rgba(255,255,255,0.6)" />
        </a>
        <button
          type="button"
          className="px-2 py-1.5 text-xs bg-blue-600 text-white"
          onClick={handleSavePage}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// iframe
function sendMessage(message: { type: string; payload?: any }, frameRef: React.RefObject<IFrame | null>) {
  frameRef.current?.contentWindow?.postMessage(message, NEXT_PUBLIC_HOST_URL as string);
}

function getEditor(frameRef: React.RefObject<IFrame | null>) {
  // @ts-expect-error
  return frameRef.current?.contentWindow?.__mile_messenger__?.editor;
}

function Divider() {
  return <div className="w-[2px] h-[20px] bg-gray-200 my-1 mx-2" />;
}
