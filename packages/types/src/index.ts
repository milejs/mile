import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type React from "react";
import { ComponentType, ReactElement, ReactNode, RefObject } from "react";
// import type { MileToast, ToastQueue } from "./toast";
export type { Block, InlineContent } from "@blocknote/core";

export interface MileOptions {
  options: OptionComponents;
  schema: MileSchema;
  resolveOptionFromField(
    field: FieldDefinition,
  ): React.ComponentType<FieldOptionProps>;
}

export interface FieldOptionProps {
  editor: MileEditor;
  options: MileOptions;
  path: string[];
  nodeId: string;
  field: FieldDefinition;
  optionValue: any;
  handleChange: (path: string[], v: any) => void;
  isSettingDirty: React.RefObject<boolean>;
}

export type MileComponentProps = {
  children: ReactNode;
  type: string;
  id: string;
  options?: any;
  className?: string;
  ref?: RefObject<HTMLDivElement | null>;
};

export type ComponentData = {
  name: string;
  component: ComponentType<MileComponentProps>;
  /** tell Render to render this component in a certain way */
  settings?: {
    /** tell Render not to wrap this component with Dnd */
    noDndWrap?: boolean;
    isInlineContent?: boolean;
    isUserComponent?: boolean;
  };
  icon?: {
    path?: string;
    component?: ReactNode;
  };
};

export type Components = Record<string, ComponentData>;

export type NodeData = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  options?: Record<string, unknown>;
  children?: string[];
};

export interface MileClient {
  config: any;
  userOptions: any;
  registry: MileRegistry;
  schema: MileSchema;
  setConfig(config: any): void;
  setUserOptions(optionComponents: any): void;
}
export interface MileRegistry {
  components: Components;
  toString(): string;
  registerComponents(components: Components): void;
  registerComponent(name: string, componentData: ComponentData): void;
  hasComponent(name: string): boolean;
  getComponent(name: string): ComponentData | null;
  mustGetComponent(name: string): ComponentData;
}

export type Config = {
  actions?: Actions;
  schema?: Schema;
  components?: Components;
};

// export type SetData = React.Dispatch<React.SetStateAction<TreeData | undefined>>;
export type SetData = (
  value: React.SetStateAction<TreeData | undefined>,
  shouldSend?: boolean,
) => void;
export type SetOperation = React.Dispatch<
  React.SetStateAction<Operation | null>
>;

/**
 * Draft Data Reducer
 */
export type DraftDataAction = {
  type: string;
  payload?: any;
};
export type DraftDataState = DraftData;
export type UpdateDraftData = React.ActionDispatch<[action: DraftDataAction]>;

export interface MileEditor {
  activeNodeId: string | null;
  mile: MileClient;
  config: Config;
  tree: MileTree;
  draft_data: DraftData;
  updateDraftData: UpdateDraftData;
  setData: SetData;
  setLastOperation: SetOperation;
  history: MileHistoryManager;
  actions: Actions;
  // schema: MileSchema;
  persister: MilePersister;
  // toastQueue: ToastQueue<MileToast>;
  // toastQueue: any;
  zoom: number;
  breakpoint: "desktop" | "tablet" | "mobile";
  is_disabled: boolean;
  setZoom(level: number): void;
  setBreakpoint(breakpoint: "desktop" | "tablet" | "mobile"): void;
  mergeMarkdownData(node_id: string, md: string): void;
  save(): void;
  publish(): void;
  updateData(data: TreeData, lastOperation?: Operation): void;
  findNode(id: string): NodeData | null;
  getNode(id: string): NodeData;
  performAction(action: Action): Action | undefined;
  perform(action: Action): void;
  undo(): void;
  redo(): void;
}

// export type OptionComponents = Record<string, ComponentType<FieldOptionProps>>;

export interface MileSchema {
  schema: Schema;
  user_schema: Schema;
  schemaMap: Map<string, SchemaTypeDefinition | FieldDefinition>;
  buildSchemaMap(): Map<string, SchemaTypeDefinition | FieldDefinition>;
  get(name: string): SchemaTypeDefinition | FieldDefinition;
  resolveField(field: FieldDefinition): FieldDefinition | SchemaTypeDefinition;
}

export type Trigger = "pointer" | "keyboard";

export type PageData = {
  id: string;
  slug: string;
  parent_id?: string | null;
  type: string;
  content: string | TreeData;
  title?: string;
  description?: string;
  status?: string | null;
  og_image_ids: string[];
  og_images: {
    size: number | null;
    type: string | null;
    id: string;
    title: string | null;
    created_at: Date;
    updated_at: Date;
    etag: string | null;
    filepath: string;
    width: number | null;
    height: number | null;
    alt: string | null;
    caption: string | null;
  }[];
  keywords?: string;
  llm?: string;
  no_index?: number;
  no_follow?: number;
  canonical_url?: string;
  created_at?: number;
  updated_at?: number;
};

export type DraftData = PageData & {
  page_id: string;
  version_number: number;
  created_by: string; // "admin" | string
  reason?: string; // "admin" | string
};

export type TreeData = {
  [id: string]: NodeData;
};

export interface MileTree {
  data: TreeData;
  updateTreeData(data: TreeData): void;
  findParentId(id: string, data?: TreeData): string | undefined;
  getParentId(id: string, data?: TreeData): string;
  moveNode(
    dragId: string,
    dropId: string,
    closestEdgeOfDrop: Edge | null,
  ): {
    data: TreeData;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        dragId: string | undefined;
        dropId: string;
        closestEdgeOfDrop: string;
      };
    };
  };

  moveRow(
    dragId: string,
    dropId: string,
    closestEdgeOfDrop: Edge | null,
  ): {
    data: TreeData;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        dragId: string | undefined;
        dropId: string;
        closestEdgeOfDrop: string;
      };
    };
  };

  reorderNode(
    dragId: string,
    dropId: string,
    closestEdgeOfDrop: Edge | null,
  ): {
    data: TreeData;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        dragId: string | undefined;
        dropId: string | undefined;
        closestEdgeOfDrop: string;
      };
    };
  };

  reorderSection(
    dragId: string,
    dropId: string,
    closestEdgeOfDrop: Edge | null,
  ): {
    data: TreeData;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        dragId: string | undefined;
        dropId: string | undefined;
        closestEdgeOfDrop: string;
      };
    };
  };

  duplicateNode(
    id: string,
    newNodeId: string,
    nodes: Record<string, NodeData>,
  ): {
    data: TreeData;
    id: any;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: any;
        prevNodeId: string;
      };
    };
  };

  deleteDuplicatedNode(
    id: string,
    prevNodeId?: string,
  ): {
    data: TreeData;
    id: string;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: string | undefined;
        newId: string | undefined;
        nodes: Record<string, NodeData>;
      };
    };
  };

  addNode(
    id: string,
    nodeId: string,
    nodes: Record<string, NodeData>,
    mode?: string,
  ): {
    data: TreeData;
    id: any;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: any;
        prevNodeId: string;
      };
    };
  };

  insertNewElement(
    id: string,
    type: string,
    mode: string,
    nodeId?: string,
    nodes?: Record<string, NodeData>,
  ): {
    data: TreeData;
    id: any;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: string;
        type: string;
        insertPrevious?: NodeData | undefined;
      };
    };
  };

  deleteNewElement(
    id: string,
    type: string,
    insertPrevious?: NodeData | undefined,
  ): {
    data: TreeData;
    id: any;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: string;
        type: string;
        mode: string;
        nodeId?: string;
        nodes?: Record<string, NodeData>;
      };
    };
  };

  deleteNode(id: string): {
    data: TreeData;
    id: string;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        id: string;
        nodeId: string;
        mode: string;
        nodes: Record<string, NodeData>;
      };
    };
  };

  updateNodeOption(
    nodeId: string,
    value: any,
    initialValue?: any,
  ): {
    data: TreeData;
    reverseAction: {
      type: string;
      name: string;
      payload: {
        nodeId: string;
        value: any;
      };
    };
  };

  find(id: string, data?: TreeData): NodeData | null;
  get(id: string): NodeData;
  // helpers
  findDescendantNodes(id: string): Record<string, NodeData>;
  duplicateNodeData(id: string): {
    newNodeId: string;
    nodes: Record<string, NodeData>;
  };
}

export interface MileTreeNode {
  id: string;
  data: NodeData;
  level: number;
  rowIndex?: number;
  parent: MileTreeNode | null;
  children?: MileTreeNode[];
}

export interface MileHistoryManager {
  canUndo: boolean;
  canRedo: boolean;
  isInCoalescing: boolean;
  startCoalescing(): void;
  commitCoalescing(): void;
  push(entry: HistoryEntry): void;
  undo(): Action | null;
  redo(): Action | null;
}

export type Actions = {
  [key: string]: (editor: MileEditor, payload: any) => Action | undefined;
};

export type Action = {
  type: string;
  name: string;
  payload: unknown;
};

export type HistoryEntry = {
  action: Action;
  reverseAction: Action;
};

export interface MilePersister {
  editor: MileEditor;
  save(
    pageData: PageData,
    content: TreeData,
    components: Components,
  ): Promise<
    | {
        message: any;
      }
    | undefined
  >;
  publish(
    pageData: PageData,
    content: TreeData,
    components: Components,
  ): Promise<
    | {
        message: any;
      }
    | undefined
  >;
}

// Operation
type Outcome =
  | { type: "duplicate-node"; targetId: string }
  | { type: "delete-duplicated-node"; targetId: string }
  | { type: "delete-node"; targetId: string }
  | { type: "add-node"; targetId: string }
  | { type: "insert-new-element"; targetId: string }
  | { type: "delete-new-element"; targetId: string }
  | { type: "section-reorder"; targetId: string }
  | { type: "move-node"; targetId: string }
  | { type: "move-row"; targetId: string }
  | { type: "update-node-option"; targetId: string };

export type Operation = {
  trigger: Trigger;
  outcome: Outcome;
};

type ConditionalProperty = boolean | ConditionalPropertyCallback | undefined;

/** @public */
export declare type ConditionalPropertyCallback = (
  context: ConditionalPropertyCallbackContext,
) => boolean;

/** @public */
export declare interface ConditionalPropertyCallbackContext {
  // document: SanityDocument | undefined;
  parent: any;
  value: any;
  // currentUser: Omit<CurrentUser, "role"> | null;
}

interface BaseSchemaDefinition {
  name?: string;
  title?: string;
  description?: string | ReactElement;
  hidden?: ConditionalProperty;
  readOnly?: ConditionalProperty;
  icon?: ComponentType | ReactNode;
  validation?: unknown;
  initialValue?: unknown;
  groups?: Group[];
  isHighlight?: boolean;
  isResponsive?: boolean;
  thumbnail?: string;
  isMarkdown?: boolean;
  getInitialNodes?: (
    node_id: string,
    generateId: () => string,
  ) => Record<string, NodeData>;
}

interface Group {
  name: string;
  label?: string;
}

interface OptionComponents {
  input?: string;
}
interface BaseOptionType {
  name: string;
  label?: string;
  type: string;
  group?: string[] | string;
  fields?: FieldDefinition[];
  settings?: {
    components?: OptionComponents;
  };
}

interface SectionOptions extends BaseOptionType {}
interface RowOptions extends BaseOptionType {}

type InitialValueProperty<Value> = Value | undefined;

interface SectionDefinition extends BaseSchemaDefinition {
  type: "section";
  fields?: FieldDefinition[];
  options?: SectionOptions;
  initialValue?: InitialValueProperty<any>;
  // validation?: ValidationBuilder<BooleanRule, boolean>;
}
interface RowDefinition extends BaseSchemaDefinition {
  type: "row";
  fields?: FieldDefinition[];
  options?: RowOptions;
  initialValue?: InitialValueProperty<any>;
  // validation?: ValidationBuilder<BooleanRule, boolean>;
}

interface ObjectOptions {
  collapsible?: boolean;
  collapsed?: boolean;
  columns?: number;
  modal?: {
    type?: "dialog" | "popover";
    width?: number | number[] | "auto";
  };
}

export interface ObjectDefinition extends BaseSchemaDefinition {
  type: "object";
  /**
   * Object must have at least one field. This is validated at Studio startup.
   */
  fields: FieldDefinition[];
  options?: ObjectOptions;
  initialValue?: InitialValueProperty<Record<string, unknown>>;
}

interface TitledListValue<V = unknown> {
  _key?: string;
  title: string;
  value?: V;
}

interface EnumListProps<V = unknown> {
  list?: Array<TitledListValue<V> | V>;
  layout?: "radio" | "dropdown";
  direction?: "horizontal" | "vertical";
}

interface StringOptions extends EnumListProps<string> {}

export interface StringDefinition extends BaseSchemaDefinition {
  type: "string";
  options?: StringOptions;
  placeholder?: string;
  // validation?: ValidationBuilder<StringRule, string>;
  initialValue?: InitialValueProperty<string>;
  fields?: FieldDefinition[];
}

type ArrayOfEntry<T> = Omit<T, "name" | "hidden"> & {
  name?: string;
};

type IntrinsicArrayOfDefinition = {
  [K in keyof BuiltInDefinitions]: Omit<
    ArrayOfEntry<BuiltInDefinitions[K]>,
    "validation" | "initialValue"
  > & {
    // validation?: SchemaValidationValue;
    initialValue?: InitialValueProperty<any>;
  };
};

type ArrayOfType<
  TType extends BuiltInTypeName = BuiltInTypeName,
  TAlias extends BuiltInTypeName | undefined = undefined,
> =
  | IntrinsicArrayOfDefinition[TType]
  | ArrayOfEntry<TypeAliasDefinition<string, TAlias>>;

interface ArrayOptions<V = unknown> {
  list?: TitledListValue<V>[] | V[];
  /**
   * layout: 'tags' only works for string array
   * layout: 'grid' only works for arrays with objects
   */
  layout?: "tags" | "grid";
  direction?: "horizontal" | "vertical";
  sortable?: boolean;
  modal?: {
    type?: "dialog" | "popover";
    width?: number | "auto";
  };
}

interface ArrayDefinition extends BaseSchemaDefinition {
  type: "array";
  of: ArrayOfType[];
  initialValue?: InitialValueProperty<unknown[]>;
  // validation?: ValidationBuilder<ArrayRule<unknown[]>, unknown[]>;
  options?: ArrayOptions;
  fields?: FieldDefinition[];
}

interface FieldDefinitionBase {
  fieldset?: string;
  group?: string | string[];
}

interface TypeAliasDefinition<
  TType extends string,
  TAlias extends BuiltInTypeName | undefined,
> extends BaseSchemaDefinition {
  name?: string;
  type: TType;
  options?: TAlias extends BuiltInTypeName
    ? BuiltInDefinitions[TAlias]["options"]
    : unknown;
  // validation?: SchemaValidationValue;
  initialValue?: InitialValueProperty<any>;
  // preview?: PreviewConfig;
  fields?: FieldDefinition[];
  components?: {
    annotation?: ComponentType<any>;
    block?: ComponentType<any>;
    inlineBlock?: ComponentType<any>;
    diff?: ComponentType<any>;
    field?: ComponentType<any>;
    input?: string;
    item?: ComponentType<any>;
    preview?: ComponentType<any>;
  };
}

type InlineFieldDefinition = {
  [K in keyof BuiltInDefinitions]: Omit<
    BuiltInDefinitions[K],
    "initialValue" | "validation"
  > & {
    // validation?: SchemaValidationValue;
    initialValue?: InitialValueProperty<any>;
  };
};

export type FieldDefinition<
  TType extends BuiltInTypeName = BuiltInTypeName,
  TAlias extends BuiltInTypeName | undefined = undefined,
> = (InlineFieldDefinition[TType] | TypeAliasDefinition<string, TAlias>) &
  FieldDefinitionBase;

// ["string", "number", "boolean", "url", "date", "richtext"];
interface BuiltInDefinitions {
  section: SectionDefinition;
  row: RowDefinition;
  object: ObjectDefinition;
  string: StringDefinition;
  array: ArrayDefinition;
}

type BuiltInTypeName = BuiltInDefinitions[keyof BuiltInDefinitions]["type"];

export type SchemaTypeDefinition<
  TType extends BuiltInTypeName = BuiltInTypeName,
> = BuiltInDefinitions[BuiltInTypeName] | TypeAliasDefinition<string, TType>;

export type Schema = SchemaTypeDefinition[];

/************************************************************
 * Router
 ************************************************************/
enum PrefetchKind {
  AUTO = "auto",
  FULL = "full",
  TEMPORARY = "temporary",
}
interface NavigateOptions {
  scroll?: boolean;
}
interface PrefetchOptions {
  kind: PrefetchKind;
}
export type RouterLike = {
  back(): void;
  forward(): void;
  refresh(): void;
  push(href: string, options?: NavigateOptions): void;
  replace(href: string, options?: NavigateOptions): void;
  prefetch(href: string, options?: PrefetchOptions): void;
};
