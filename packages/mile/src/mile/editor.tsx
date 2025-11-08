import { createContext, useContext, useMemo } from "react";
import { useMileProvider } from "./client";
import { invariant } from "@/lib/invariant";
import {
  Action,
  Actions,
  Config,
  HistoryEntry,
  MileClient,
  MileEditor,
  MileHistoryManager,
  MilePersister,
  Operation,
  PageMetaData,
  Schema,
  SchemaTypeDefinition,
  SetData,
  SetOperation,
  TreeData,
  NodeData,
  Trigger,
  Components,
  PageData,
  MileSchema,
} from "@milejs/types";
import { Tree } from "./tree";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";
import { mutate } from "swr";
import { toast } from "sonner";
import { convertNodeDataToBlocks, mdxToTree } from "./data";
import { BlockNoteEditor } from "@blocknote/core";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;

const EditorContext = createContext<Editor | null>(null);

export function useEditor() {
  const c = useContext(EditorContext);
  invariant(c);
  return c;
}

type EditorProviderProps = {
  children: React.ReactNode;
  tree: Tree;
  setData: SetData;
  setLastOperation: SetOperation;
  page_data: PageData;
};
export function EditorProvider({
  page_data,
  children,
  tree,
  setData,
  setLastOperation,
}: EditorProviderProps) {
  const mile = useMileProvider();
  invariant(mile);
  const editor = useMemo(() => {
    return new Editor(mile, tree, page_data, setData, setLastOperation);
  }, [mile, page_data, tree, setData, setLastOperation]);
  return <EditorContext value={editor}>{children}</EditorContext>;
}

// class EditorSchema implements MileEditorSchema {
//   schema: Schema;
//   schemaMap: Map<string, SchemaTypeDefinition | FieldDefinition>;
//   constructor(schema: Schema) {
//     this.schema = schema;
//     this.schemaMap = this.buildSchemaMap();
//   }
//   buildSchemaMap() {
//     const map = new Map<string, SchemaTypeDefinition | FieldDefinition>();
//     for (const entry of this.schema) {
//       if (!entry.name) throw new Error("Name is required in schema");
//       if (!map.has(entry.name)) {
//         map.set(entry.name, entry);
//       }
//     }
//     return map;
//   }
//   get(name: string) {
//     if (this.schemaMap.has(name)) {
//       const schema = this.schemaMap.get(name);
//       invariant(schema);
//       return schema;
//     } else {
//       throw new Error(`Unknown schema type: ${name}`);
//     }
//   }
//   resolveField(field: FieldDefinition) {
//     if (isBuiltinSchemaType(field.type)) {
//       return field;
//     } else if (this.schemaMap.has(field.type)) {
//       const resolvedField = this.schemaMap.get(field.type);
//       if (!resolvedField) {
//         throw new Error("Unknown field");
//       }
//       return resolvedField;
//     } else {
//       throw new Error("Unknown field");
//     }
//   }
// }

// function isBuiltinSchemaType(type: string) {
//   return (
//     type === "string" ||
//     type === "number" ||
//     type === "boolean" ||
//     type === "object" ||
//     type === "array" ||
//     type === "section"
//   );
// }

const actions: Actions = {
  reorderSection(
    editor,
    payload: {
      dragId: string;
      dropId: string;
      closestEdgeOfDrop: Edge | null;
      trigger: Trigger;
    },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.reorderSection(
      dragId,
      dropId,
      closestEdgeOfDrop,
    );
    editor.updateData(result.data, {
      trigger,
      outcome: { type: "section-reorder", targetId: dragId },
    });
    return result.reverseAction;
  },

  moveRow(
    editor,
    payload: {
      dragId: string;
      dropId: string;
      closestEdgeOfDrop: Edge | null;
      trigger: Trigger;
    },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.moveRow(dragId, dropId, closestEdgeOfDrop);
    editor.updateData(result.data, {
      trigger,
      outcome: { type: "move-row", targetId: dragId },
    });
    return result.reverseAction;
  },

  moveNode(
    editor,
    payload: {
      dragId: string;
      dropId: string;
      closestEdgeOfDrop: Edge | null;
      trigger: Trigger;
    },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.moveNode(dragId, dropId, closestEdgeOfDrop);
    editor.updateData(result.data, {
      trigger,
      outcome: { type: "move-node", targetId: dragId },
    });
    return result.reverseAction;
  },

  duplicateNode(
    editor,
    payload: { id: string; newNodeId: string; nodes: Record<string, NodeData> },
  ): Action | undefined {
    const { id, newNodeId, nodes } = payload;
    const result = editor.tree.duplicateNode(id, newNodeId, nodes);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "duplicate-node", targetId: result.id },
    });
    return result.reverseAction;
  },

  deleteDuplicatedNode(
    editor,
    payload: { id: string; prevNodeId?: string },
  ): Action | undefined {
    const { id, prevNodeId } = payload;
    const result = editor.tree.deleteDuplicatedNode(id, prevNodeId);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "delete-duplicated-node", targetId: result.id },
    });
    return result.reverseAction;
  },

  addNode(
    editor,
    payload: {
      id: string;
      nodeId: string;
      mode?: string;
      nodes: Record<string, NodeData>;
    },
  ): Action | undefined {
    const { id, nodeId, mode, nodes } = payload;
    const result = editor.tree.addNode(id, nodeId, nodes, mode);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "add-node", targetId: result.id },
    });
    return result.reverseAction;
  },

  deleteNode(editor, payload: { id: string }): Action | undefined {
    const { id } = payload;
    const result = editor.tree.deleteNode(id);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "delete-node", targetId: result.id },
    });
    return result.reverseAction;
  },

  updateNodeOption(
    editor,
    payload: { nodeId: string; value: any; initialValue?: any },
  ): Action | undefined {
    const { nodeId, value, initialValue } = payload;
    const result = editor.tree.updateNodeOption(nodeId, value, initialValue);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "update-node-option", targetId: nodeId },
    });
    return result.reverseAction;
  },

  insertNewElement(
    editor,
    payload: {
      id: string;
      type: string;
      mode: string;
      nodeId?: string;
      nodes?: Record<string, NodeData>;
    },
  ): Action | undefined {
    const { id, type, mode, nodeId, nodes } = payload;
    const result = editor.tree.insertNewElement(id, type, mode, nodeId, nodes);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "insert-new-element", targetId: result.id },
    });
    return result.reverseAction;
  },

  deleteNewElement(
    editor,
    payload: {
      id: string;
      type: string;
      insertPrevious?: NodeData | undefined;
    },
  ): Action | undefined {
    const { id, type, insertPrevious } = payload;
    const result = editor.tree.deleteNewElement(id, type, insertPrevious);
    editor.updateData(result.data, {
      trigger: "pointer",
      outcome: { type: "delete-new-element", targetId: result.id },
    });
    return result.reverseAction;
  },
};

function initializeActions(actions: Actions, userActions?: Actions): Actions {
  return { ...actions, ...userActions };
}

function initializeSchema(schema: Schema, userSchema?: Schema): Schema {
  if (!userSchema) return schema;
  return [...schema, ...userSchema];
}

export class Editor implements MileEditor {
  activeNodeId: string | null;
  mile: MileClient;
  config: Config;
  tree: Tree;
  // stores page_data that has page metadata (page content is in here but we manage it through editor's tree instead)
  page_data: PageData;
  setData: SetData;
  setLastOperation: SetOperation;
  history: HistoryManager = new HistoryManager();
  actions: Actions;
  // schema: EditorSchema;
  persister: MilePersister;
  // toastQueue: ToastQueue<MileToast>;
  zoom: number;
  breakpoint: "desktop" | "tablet" | "mobile";
  is_disabled: boolean;

  constructor(
    mile: MileClient,
    tree: Tree,
    page_data: PageData,
    setData: SetData,
    setLastOperation: SetOperation,
  ) {
    this.activeNodeId = null;
    this.is_disabled = false;
    this.mile = mile;
    this.config = mile.config;
    this.tree = tree;
    this.page_data = page_data;
    this.setData = setData;
    this.setLastOperation = setLastOperation;
    this.actions = initializeActions(actions, mile.config.actions);
    // this.schema = new EditorSchema(initializeSchema(schema, mile.config.schema));
    this.persister = new Persister(this);
    // this.toastQueue = new ToastQueue({
    //   maxVisibleToasts: 5,
    // });
    this.zoom = 1;
    this.breakpoint = "desktop";
    // console.log("Editor ctor mile.registry", this.mile.registry);
  }

  selectNode(id: string) {
    this.activeNodeId = id;
    this.forceReRender(false);
  }

  deselectNode(id: string) {
    this.activeNodeId = null;
    this.forceReRender(false);
  }

  setZoom(level: number) {
    this.zoom = level;
    // force re-render
    const newData = { ...this.tree.data };
    this.setData(newData);
  }

  setBreakpoint(breakpoint: "desktop" | "tablet" | "mobile") {
    this.breakpoint = breakpoint;
    this.forceReRender();
  }

  forceReRender(shouldSend = true) {
    // force re-render
    const newData = { ...this.tree.data };
    this.setData(newData, shouldSend);
  }

  mergeMarkdownData(node_id: string, md: string) {
    console.log("------ mergeData", node_id, md);
    const current_node = this.getNode(node_id);
    const markdown = mdxToTree(md);
    const content = markdown.result.content;
    const markdown_root = content.root;
    if (markdown_root && markdown_root.children.length === 0) {
      // mardown has no data to update
      return;
    }

    // process markdown
    // - get start_node and ensure it exists
    // - get index of the current_node in the root's children array
    // - change current_node to be start_node but preserve the current_node's id
    // - update tree root's children to add all node ids from markdown except start_node's id
    // - delete old current_node's children nodes
    // - add everything else in markdown nodes except the start_node and the root
    let tree = this.tree.data;
    invariant(tree.root.children);
    const index = tree.root.children.indexOf(current_node.id);
    invariant(index !== undefined && index !== -1, "current_node not found");
    const __id = markdown_root.children[0];
    const start_node = content[__id];
    invariant(start_node, "start_node not found");

    tree = {
      ...tree,
      // change current_node to be start_node but preserve the current_node's id
      [node_id]: {
        ...start_node,
        id: node_id,
      },

      // update root children
      // markdown root children: [s,x,y] // s is start_node
      // current root children: [a,b,c,d] // c is the node_id at `index`
      // new root children: [a,b,c,x,y,d] // preserve c, add x and y
      root: {
        ...tree.root,
        children: [
          ...tree.root.children!.slice(0, index),
          current_node.id, // keep current_node's id
          ...markdown_root.children.slice(1), // first child is the start_node, so we skip it
          ...tree.root.children!.slice(index + 1),
        ],
      },
    };

    // delete the old current_node's children nodes because current_node is now start_node (except the id)
    if (current_node.children) {
      for (const child_id of current_node.children) {
        // TODO: is this safe to delete mutably? should we do spread and set child_id to undefined?
        delete tree[child_id];
      }
    }

    // add all nodes from markdown's content to the tree except the start_node and the root
    const { [__id]: _, root, ...rest } = content;
    // add them to the tree
    const new_tree = {
      ...tree,
      ...rest,
    };

    this.tree.updateTreeData(new_tree);
    this.updateData(new_tree);
  }

  async save() {
    this.is_disabled = true;
    this.forceReRender();
    try {
      const result = await this.persister.save(
        this.page_data.id,
        this.page_data,
        this.tree.data,
        this.mile.registry.components,
      );
      this.is_disabled = false;
      this.forceReRender();
      toast.success("Saved successfully");
      window.location.reload();
      return { ok: true, error: undefined };
    } catch (error) {
      this.is_disabled = false;
      this.forceReRender();
      toast.error("Failed to save");
      return { ok: false, error };
    }
  }

  updateData(data: TreeData, lastOperation?: Operation) {
    this.setData(data);
    this.setLastOperation(lastOperation ?? null);
  }

  findNode(id: string) {
    return this.tree.find(id);
  }

  getNode(id: string) {
    const node = this.tree.find(id);
    invariant(node, "node not found");
    return node;
  }

  performAction(action: Action) {
    const execute = this.actions[action.type];
    if (!execute) throw new Error("Unknown actor");
    return execute(this, action.payload);
  }

  perform(action: Action) {
    const reverseAction = this.performAction(action);
    if (!reverseAction) return;
    this.history.push({ action, reverseAction });
  }

  undo() {
    const entry = this.history.undo();
    if (entry == null) return;
    this.performAction(entry);
  }

  redo() {
    const entry = this.history.redo();
    if (entry == null) return;
    this.performAction(entry);
  }
}

export class HistoryManager implements MileHistoryManager {
  private undoStack: HistoryEntry[];
  private redoStack: HistoryEntry[];
  private coalesceState: CoalescingState;
  constructor(
    undoStack = [],
    redoStack = [],
    coalesceState: CoalescingState = { type: CoalescingType.NOT_IN_COALESCE },
  ) {
    this.redoStack = redoStack;
    this.undoStack = undoStack;
    this.coalesceState = coalesceState;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get isInCoalescing() {
    return this.coalesceState.type === CoalescingType.IN_COALESCE;
  }

  startCoalescing = () => {
    this.coalesceState = { type: CoalescingType.IN_COALESCE, entry: null };
  };

  commitCoalescing = () => {
    if (
      this.coalesceState.type === CoalescingType.NOT_IN_COALESCE ||
      this.coalesceState.entry == null
    ) {
      return;
    }
    const actionToCommit = this.coalesceState.entry;
    this.coalesceState = { type: CoalescingType.NOT_IN_COALESCE };
    this.push(actionToCommit);
  };

  push = (entry: HistoryEntry) => {
    if (this.coalesceState.type === CoalescingType.IN_COALESCE) {
      this.coalesceState.entry = entry;
      return;
    }
    if (this.redoStack.length > 0) {
      this.redoStack = [];
    }
    this.undoStack.push(entry);
  };

  undo = (): Action | null => {
    if (this.coalesceState.type === CoalescingType.IN_COALESCE) {
      this.commitCoalescing();
    }
    const top = this.undoStack.pop();
    if (top == null) {
      return null;
    }
    this.redoStack.push(top);
    return top.reverseAction;
  };

  redo = (): Action | null => {
    if (this.coalesceState.type === CoalescingType.IN_COALESCE) {
      this.commitCoalescing();
    }
    const top = this.redoStack.pop();
    if (top == null) {
      return null;
    }
    this.undoStack.push(top);
    return top.action;
  };
}

/**
 * {
    "root": {
        "id": "root",
        "type": "root",
        "props": {},
        "options": {},
        "children": [
            "fe8eb00a-d4c6-428c-b513-3611bccacf53"
        ]
    },
    "fe8eb00a-d4c6-428c-b513-3611bccacf53": {
        "id": "fe8eb00a-d4c6-428c-b513-3611bccacf53",
        "type": "hero",
        "props": {
            "className": ""
        },
        "options": {
            "title": "Supreme",
            "image": {
                "image_url": "https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-12-cropped-jpg",
                "alt_text": ""
            },
            "link": {
                "url": "/aa",
                "link_text": "Book",
                "is_external": false
            }
        }
    }
  }
 */
function treeToMDXstring(data: TreeData, components: Components) {
  const lines: string[] = [];
  if (!components) {
    return "";
  }

  // mutate lines
  function renderNode(
    componentId: string,
    data: TreeData,
    components: Components,
  ) {
    const node = data[componentId];
    console.log("renderNode", componentId, node);
    if (!node) return;

    if (node.type !== "root") {
      const str = serializeNode(node, components, data);
      lines.push(str);
    } else {
      // Recursively render children if any
      if (node.children && node.children.length > 0) {
        node.children.forEach((childId) =>
          renderNode(childId, data, components),
        );
      }
    }
  }
  renderNode("root", data, components);
  return lines.join("\n");
}

function serializeNode(node: NodeData, components: Components, data: TreeData) {
  const type = node.type;
  const component = components[type];
  console.log("serializeNode for type: ", type, component);

  invariant(component, `serializeNode: Unknown component type: ${type}`);
  if (component.settings?.isUserComponent) {
    return serializeUserComponentNode(node, components, data);
  }
  // if it's not user component, it's a markdown
  // - convert NodeData to Block[]
  // - use BlockNoteEditor to convert Block[] to Markdown
  const blocks = convertNodeDataToBlocks(node, data);
  // console.log("blocks", blocks);
  const editor = BlockNoteEditor.create({
    initialContent: blocks,
    readOnly: true,
  });
  const md = editor.blocksToMarkdownLossy();
  return md;
}

function treeToMDXstring_bk(data: TreeData, components: Components) {
  const lines: string[] = [];
  if (!components) {
    return "";
  }

  // mutate lines
  function renderNode(
    componentId: string,
    data: TreeData,
    components: Components,
  ) {
    const node = data[componentId];
    console.log("renderNode", componentId, node);
    if (!node) return;

    if (node.id !== "root") {
      const str = serializeNode(node, components, data);
      lines.push(str);
    }
    const shouldProcessChildren = node.type === "root";
    // Recursively render children if any
    if (shouldProcessChildren && node.children && node.children.length > 0) {
      node.children.forEach((childId) => renderNode(childId, data, components));
    }
  }
  renderNode("root", data, components);
  return lines.join("\n");
}

function serializeNode_bk(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const type = node.type;
  console.log("serializeNode for type: ", type);
  const component = components[type];
  console.log("component", component);

  invariant(component, `serializeNode: Unknown component type: ${type}`);
  if (component.settings?.isUserComponent) {
    return serializeUserComponentNode(node, components, data);
  }
  switch (type) {
    case "paragraph": {
      return serializeParagraphNode(node, components, data);
    }
    case "heading": {
      return serializeHeadingNode(node, components, data);
    }
    case "strong": {
      return serializeStrongNode(node, components, data);
    }
    case "text": {
      return serializeTextNode(node, components, data);
    }
    case "list": {
      return serializeListNode(node, components, data);
    }
    default: {
      throw new Error(`serializeNode: Unknown component type: ${type}`);
    }
  }
}

function serializeListNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  console.log("serializeListNode", node);
  throw new Error("stop");
  /**
   * {
       "type": "list",
       "id": "504baa467866d34823644776a0fb8889",
       "props": {
           "ordered": false,
           "start": null
       },
       "options": {},
       "children": [
           "de6e58985368ab2e8649b11f3f1dc0da",
           "0948bc47a6fa4526b8faf53c6fe2c3b7"
       ]
   }
   */

  const { id, type, props = {}, options = {}, children = [] } = node;
  let text = "";
  for (let i = 0; i < children.length; i++) {
    const child = data[children[i]];
    text += serializeNode(child, components, data);
  }
  return `${text}\n`;
}

function serializeParagraphNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const { id, type, props = {}, options = {}, children = [] } = node;
  let text = "";
  for (let i = 0; i < children.length; i++) {
    const child = data[children[i]];
    text += serializeNode(child, components, data);
  }
  return `${text}\n`;
}

function getDirectTextFromChildren(children: string[], data: TreeData) {
  const text_node_id = children.length > 0 ? children[0] : null;
  const text_node = text_node_id ? data[text_node_id] : null;
  return text_node ? text_node.props?.value : "";
}

function serializeHeadingNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const { id, type, props = {}, options = {}, children = [] } = node;
  const depth = (props.depth as number) ?? 1;
  const text = getDirectTextFromChildren(children, data);
  return `${"#".repeat(depth)} ${text}\n`;
}

function serializeStrongNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const { id, type, props = {}, options = {}, children = [] } = node;
  const depth = (props.depth as number) ?? 1;
  const text = getDirectTextFromChildren(children, data);
  return `**${text}**`;
}

function serializeTextNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const { id, type, props = {}, options = {}, children = [] } = node;
  const text = props?.value;
  return `${text}`;
}

function serializeUserComponentNode(
  node: NodeData,
  components: Components,
  data: TreeData,
) {
  const { id, type, props = {}, options = {} } = node;
  // Get componentName i.e. <Hero />
  const componentName = components[type].component.name;
  // Convert props safely (only use className for now)
  const className = props.className ?? "";
  // Serialize options object as inline JS
  const optionsString = JSON.stringify(options)
    .replace(/"([^"]+)":/g, "$1:") // remove quotes from keys
    .replace(/"/g, '"'); // keep quotes for string values
  const str =
    optionsString === "{}"
      ? `<${componentName} id="${id}" type="${type}" className="${className}" />\n`
      : `<${componentName} id="${id}" type="${type}" className="${className}" options={${optionsString}} />\n`;
  return str;
}

class Persister implements MilePersister {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  async save(
    id: string,
    page_data: PageData,
    content: TreeData,
    components: Components,
  ) {
    console.log("save", page_data, content);

    // convert json to mdx string
    let mdxstring = "";
    try {
      mdxstring = treeToMDXstring(content, components);
    } catch (error) {
      console.error("Error converting tree to MDX", error);
      throw error;
    }

    console.log("mdxstring", mdxstring);

    return mutate(
      [`/pages`, `/${id}`],
      async () => {
        const resp = await fetch(`${API}/pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...page_data, content: mdxstring }),
        });
        if (!resp.ok) {
          const error = new Error("An error occurred while saving the page.");
          const info = await resp.json();
          console.error("Error saving page", info);
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
}

/**************************************
 * Types
 *************************************/
enum CoalescingType {
  IN_COALESCE = "in-coalesce",
  NOT_IN_COALESCE = "not-in-coalesce",
}

interface InCoalesce {
  type: CoalescingType.IN_COALESCE;
  entry: HistoryEntry | null;
}

interface NotInCoalesce {
  type: CoalescingType.NOT_IN_COALESCE;
}

type CoalescingState = InCoalesce | NotInCoalesce;
