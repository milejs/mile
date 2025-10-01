import { createContext, useContext, useMemo } from "react";
import { useMileProvider } from "./client";
import { invariant } from "@/lib/invariant";
import { Action, Actions, Config, HistoryEntry, MileClient, MileEditor, MileEditorSchema, MileHistoryManager, MilePersister, Operation, PageMetaData, Schema, SchemaTypeDefinition, SetData, SetOperation, TreeData, NodeData, Trigger } from "@milejs/types";
import { Tree } from "./tree";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";

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
};
export function EditorProvider({ children, tree, setData, setLastOperation }: EditorProviderProps) {
  const mile = useMileProvider();
  invariant(mile);
  const editor = useMemo(() => {
    return new Editor(mile, tree, setData, setLastOperation);
  }, [mile, tree, setData, setLastOperation]);
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
  setData: SetData;
  setLastOperation: SetOperation;
  history: HistoryManager = new HistoryManager();
  actions: Actions;
  // schema: EditorSchema;
  persister: MilePersister;
  // toastQueue: ToastQueue<MileToast>;
  zoom: number;
  breakpoint: "desktop" | "tablet" | "mobile";

  constructor(mile: MileClient, tree: Tree, setData: SetData, setLastOperation: SetOperation) {
    this.mile = mile;
    this.config = mile.config;
    this.tree = tree;
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
    // force re-render
    const newData = { ...this.tree.data };
    this.setData(newData);
  }

  async save(pageData: PageMetaData) {
    console.log("pageData", pageData, this.tree.data);
    const result = await this.persister.save(pageData.id, pageData, this.tree.data);
    // if (result?.message) {
    //   this.toastQueue.add({ type: "error", title: "Error!", description: result.message });
    // }
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

class Persister implements MilePersister {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  async save(id: string, pageData: PageMetaData, content: TreeData) {
    const resp = await fetch(`/api/mile/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pageData, content }),
    });

    if (!resp.ok) {
      const info = await resp.json();
      console.error("save error", info);
      if (info?.message) {
        return { message: info.message };
      }
      return {
        message:
          "An error occurred while saving the page. If you think the changes you've made is okay and the error keeps happening, please contact us.",
      };
    }

    const result = await resp.json();
    if (result != null) {
      const url = new URL(`/mile${pageData.slug}/edit`, window.parent.location.origin);
      // sendMessage({ type: "http-redirect", payload: url.toString() });
      return undefined;
    }
    return {
      message:
        "An error occurred while saving the page. If you think the changes you've made is okay and the error keeps happening, please contact us.",
    };
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

