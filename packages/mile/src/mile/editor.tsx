import { createContext, useContext, useMemo } from "react";
import { useMileProvider } from "./client";
import { invariant } from "@/lib/invariant";
import { Action, Actions, Config, HistoryEntry, MileClient, MileEditor, MileHistoryManager, MilePersister, Operation, PageMetaData, Schema, SchemaTypeDefinition, SetData, SetOperation, TreeData, NodeData, Trigger, Components, PageData } from "@milejs/types";
import { Tree } from "./tree";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";
import { mutate } from "swr";
import { toast } from "sonner";

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
export function EditorProvider({ page_data, children, tree, setData, setLastOperation }: EditorProviderProps) {
  const mile = useMileProvider();
  invariant(mile);
  const editor = useMemo(() => {
    return new Editor(mile, tree, page_data, setData, setLastOperation);
  }, [mile, page_data, tree, setData, setLastOperation]);
  return (
    <EditorContext value={editor}>{children}</EditorContext>
  );
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
    payload: { dragId: string; dropId: string; closestEdgeOfDrop: Edge | null; trigger: Trigger },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.reorderSection(dragId, dropId, closestEdgeOfDrop);
    editor.updateData(result.data, { trigger, outcome: { type: "section-reorder", targetId: dragId } });
    return result.reverseAction;
  },

  moveRow(
    editor,
    payload: { dragId: string; dropId: string; closestEdgeOfDrop: Edge | null; trigger: Trigger },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.moveRow(dragId, dropId, closestEdgeOfDrop);
    editor.updateData(result.data, { trigger, outcome: { type: "move-row", targetId: dragId } });
    return result.reverseAction;
  },

  moveNode(
    editor,
    payload: { dragId: string; dropId: string; closestEdgeOfDrop: Edge | null; trigger: Trigger },
  ): Action | undefined {
    const { dragId, dropId, closestEdgeOfDrop, trigger } = payload;
    if (dragId === dropId) return;
    const result = editor.tree.moveNode(dragId, dropId, closestEdgeOfDrop);
    editor.updateData(result.data, { trigger, outcome: { type: "move-node", targetId: dragId } });
    return result.reverseAction;
  },

  duplicateNode(editor, payload: { id: string; newNodeId: string; nodes: Record<string, NodeData> }): Action | undefined {
    const { id, newNodeId, nodes } = payload;
    const result = editor.tree.duplicateNode(id, newNodeId, nodes);
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "duplicate-node", targetId: result.id } });
    return result.reverseAction;
  },

  deleteDuplicatedNode(editor, payload: { id: string; prevNodeId?: string }): Action | undefined {
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
    payload: { id: string; nodeId: string; mode?: string; nodes: Record<string, NodeData> },
  ): Action | undefined {
    const { id, nodeId, mode, nodes } = payload;
    const result = editor.tree.addNode(id, nodeId, nodes, mode);
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "add-node", targetId: result.id } });
    return result.reverseAction;
  },

  deleteNode(editor, payload: { id: string }): Action | undefined {
    const { id } = payload;
    const result = editor.tree.deleteNode(id);
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "delete-node", targetId: result.id } });
    return result.reverseAction;
  },

  updateNodeOption(
    editor,
    payload: { nodeId: string; value: any; initialValue?: any },
  ): Action | undefined {
    const { nodeId, value, initialValue } = payload;
    const result = editor.tree.updateNodeOption(nodeId, value, initialValue);
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "update-node-option", targetId: nodeId } });
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
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "insert-new-element", targetId: result.id } });
    return result.reverseAction;
  },

  deleteNewElement(editor, payload: { id: string; type: string; insertPrevious?: NodeData | undefined }): Action | undefined {
    const { id, type, insertPrevious } = payload;
    const result = editor.tree.deleteNewElement(id, type, insertPrevious);
    editor.updateData(result.data, { trigger: "pointer", outcome: { type: "delete-new-element", targetId: result.id } });
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

  constructor(mile: MileClient, tree: Tree, page_data: PageData, setData: SetData, setLastOperation: SetOperation) {
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

  forceReRender() {
    // force re-render
    const newData = { ...this.tree.data };
    this.setData(newData);
  }

  async save() {
    this.is_disabled = true;
    this.forceReRender();
    try {
      const result = await this.persister.save(this.page_data.id, this.page_data, this.tree.data, this.config.components);
      this.is_disabled = false;
      this.forceReRender();
      toast.success("Saved successfully");
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
  constructor(undoStack = [], redoStack = [], coalesceState: CoalescingState = { type: CoalescingType.NOT_IN_COALESCE }) {
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
    if (this.coalesceState.type === CoalescingType.NOT_IN_COALESCE || this.coalesceState.entry == null) {
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
function treeToMDXstring(data: TreeData, components?: Components | undefined) {
  const lines: string[] = [];

  function renderComponent(componentId: string) {
    const component = data[componentId];
    if (!component) return;

    const { id, type, props = {}, options = {} } = component;
    if (id !== "root") {
      invariant(components && components[type], `Unknown component type: ${type}`);
      // Convert props safely (only use className for now)
      const className = props.className ?? '';

      // Serialize options object as inline JS
      const optionsString = JSON.stringify(options)
        .replace(/"([^"]+)":/g, '$1:') // remove quotes from keys
        .replace(/"/g, '"'); // keep quotes for string values

      // Get componentName i.e. <Hero />
      const componentName = components[type].component.name;

      const line = optionsString === "{}"
        ? `<${componentName} id="${id}" type="${type}" className="${className}" />`
        : `<${componentName} id="${id}" type="${type}" className="${className}" options={${optionsString}} />`;

      lines.push(line);
    }
    // Recursively render children if any
    if (component.children && component.children.length > 0) {
      component.children.forEach(childId => renderComponent(childId));
    }
  }
  renderComponent('root');
  return lines.join('\n');
}

class Persister implements MilePersister {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  async save(id: string, page_data: PageData, content: TreeData, components?: Components | undefined) {
    // convert json to mdx string
    const mdxstring = treeToMDXstring(content, components);
    console.log('mdxstring', mdxstring);

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

