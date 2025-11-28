"use client";

import {
  ComponentData,
  Components,
  Config,
  FieldDefinition,
  MileClient,
  MileComponentProps,
  MileRegistry,
  MileSchema as MileSchemaType,
  NodeData,
  Schema,
  SchemaTypeDefinition,
  TreeData,
} from "@milejs/types";
import React, {
  ComponentType,
  createContext,
  JSX,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { invariant } from "@/lib/invariant";

const MileContext = createContext<Mile | null>(null);

type MileProviderProps = {
  children: React.ReactNode;
  config: Config;
};
export function MileProvider({ children, config }: MileProviderProps) {
  const mile = useMemo(() => {
    return new Mile(config);
  }, [config]);

  useEffect(() => {
    if (config) {
      mile.setConfig(config);
    }
    // if (optionComponents) {
    //   mile.setUserOptions(optionComponents);
    // }
  }, [mile, config]);

  // console.log("context", mile);
  return <MileContext.Provider value={mile}>{children}</MileContext.Provider>;
}

export function useMileProvider() {
  const c = useContext(MileContext);
  invariant(c);
  return c;
}

function initializeSchema(userSchema?: Schema): Schema {
  if (!userSchema) return internalSchema;
  return [...internalSchema, ...userSchema];
}

function initializeComponentLibrarySchema(userSchema?: Schema): Schema {
  const internal = builtinComponentLibrarySchema.map((e) => {
    if (!e.type) throw new Error("Name is required in component schema");
    if (!e.getInitialNodes || !e.thumbnail) {
      const found = internalSchema.find((s) => s.type === e.type);
      if (!found)
        throw new Error(`Component ${e.type} not found in internal schema`);
      return found;
    }
    return e;
  });
  if (!userSchema) return internal;
  return [...internal, ...userSchema];
}

class MileSchema implements MileSchemaType {
  user_schema: Schema;
  component_library_schema: Schema;
  schema: Schema;
  schemaMap: Map<string, SchemaTypeDefinition | FieldDefinition>;
  constructor(schema: Schema) {
    this.user_schema = schema; // from config.schema
    // component_library_schema is used in "add" component picker. it combines built-in component schema and user schema
    // it needs to have 'type', 'getInitialNodes', 'thumbnail' and 'title'
    this.component_library_schema = initializeComponentLibrarySchema(schema);
    this.schema = initializeSchema(schema); // combine user and internal schema
    this.schemaMap = this.buildSchemaMap();
  }
  buildSchemaMap() {
    const map = new Map<string, SchemaTypeDefinition | FieldDefinition>();
    for (const entry of this.schema) {
      if (!entry.type) throw new Error("Name is required in schema");
      if (!map.has(entry.type)) {
        map.set(entry.type, entry);
      }
    }
    return map;
  }
  get(name: string) {
    if (this.schemaMap.has(name)) {
      const schema = this.schemaMap.get(name);
      invariant(schema);
      return schema;
    } else {
      throw new Error(`Unknown schema type: ${name}`);
    }
  }
  resolveField(field: FieldDefinition): FieldDefinition | SchemaTypeDefinition {
    throw new Error("Method not implemented.");
  }
}

// 'type', 'getInitialNodes', 'thumbnail' and 'title'
const builtinComponentLibrarySchema = [
  {
    // component library schema for markdown (we use paragraph as a default type)
    type: "paragraph",
    title: "Markdown",
    thumbnail: "/mile-thumbnails/markdown.png",
    getInitialNodes: (node_id: string, generateId: () => string) => {
      const child_id = generateId();
      return {
        [node_id]: {
          id: node_id,
          type: "paragraph",
          props: {},
          options: undefined,
          children: [child_id],
        },
        [child_id]: {
          id: child_id,
          type: "text",
          props: { value: "Paragraph" },
          options: undefined,
          children: [],
        },
      };
    },
  },
  {
    type: "image_container",
  },
];

const internalSchema = [
  {
    type: "link",
    name: "link",
    title: "Link",
    fields: [
      {
        type: "url",
        name: "url",
        title: "URL",
      },
      {
        type: "string",
        name: "link_text",
        title: "Link Text",
      },
      {
        type: "boolean",
        name: "is_external",
        title: "External",
      },
    ],
  },
  {
    type: "image",
    name: "image",
    title: "Image",
    fields: [
      {
        type: "image_url",
        name: "image_url",
        title: "Image URL",
      },
      {
        type: "string",
        name: "alt_text",
        title: "Alt Text",
      },
    ],
    preview: {
      select: {
        url: "image_url",
        alt: "alt_text",
      },
      prepare({ url, alt }: any) {
        return {
          title: alt,
          media: url,
        };
      },
    },
  },
  {
    type: "image_container",
    name: "image_container",
    title: "Images",
    thumbnail: "/mile-thumbnails/image_container.png",
    fields: [
      {
        type: "array",
        name: "images",
        title: "Images",
        of: [
          {
            type: "image",
            name: "image",
            title: "Image",
          },
        ],
        options: {
          layout: "list",
        },
      },
      {
        type: "string",
        name: "mode",
        title: "Mode",
      },
    ],
    getInitialNodes: (node_id: string) => {
      return {
        [node_id]: {
          id: node_id,
          type: "image_container",
          props: {
            className: "",
          },
          options: undefined,
          children: [],
        },
      };
    },
  },
  {
    type: "heading",
    name: "heading",
    title: "Heading",
    fields: [],
    isMarkdown: true,
  },
  {
    type: "paragraph",
    name: "paragraph",
    title: "Paragraph",
    fields: [],
    isMarkdown: true,
  },
  {
    type: "text",
    name: "text",
    title: "Text",
    fields: [],
    isMarkdown: true,
  },
  {
    type: "list",
    name: "list",
    title: "List",
    fields: [],
    isMarkdown: true,
  },
  {
    type: "thematicBreak",
    name: "thematicBreak",
    title: "Thematic break",
    fields: [],
    isMarkdown: true,
  },
];

// markdown components
const builtinComponents: Components = {
  heading: {
    name: "heading",
    component: Heading,
  },
  image_container: {
    name: "image_container",
    component: ImageContainer,
  },
  paragraph: {
    name: "paragraph",
    component: Paragraph,
  },
  strong: {
    name: "strong",
    component: Strong,
    settings: {
      isInlineContent: true,
    },
  },
  emphasis: {
    name: "emphasis",
    component: Emphasis,
    settings: {
      isInlineContent: true,
    },
  },
  link: {
    name: "link",
    component: Link,
    settings: {
      isInlineContent: true,
    },
  },
  text: {
    name: "text",
    component: Text,
    settings: {
      isInlineContent: true,
    },
  },
  list: {
    name: "list",
    component: List,
    settings: {
      isInlineContent: true,
    },
  },
  listItem: {
    name: "listItem",
    component: ListItem,
    settings: {
      isInlineContent: true,
    },
  },
  break: {
    name: "break",
    component: Break,
    settings: {
      isInlineContent: true,
    },
  },
  thematicBreak: {
    name: "thematicBreak",
    component: ThematicBreak,
    settings: {
      isInlineContent: true,
    },
  },
  image: {
    name: "image",
    component: MDImage,
    settings: {
      isInlineContent: true,
    },
  },
};

class Mile implements MileClient {
  config: Config;
  userOptions: any;
  registry: Registry;
  schema: MileSchema;

  constructor(config: Config, optionComponents?: any) {
    this.config = config;
    if (optionComponents) this.userOptions = optionComponents;
    this.registry = new Registry(config.components);
    if (!this.config.schema) {
      throw new Error("config.schema is required");
    }
    this.schema = new MileSchema(this.config.schema);
  }

  setConfig(config: any) {
    this.config = config;
  }

  setUserOptions(optionComponents: any) {
    this.userOptions = optionComponents;
  }
}

function getHeadingClasses(level: number) {
  switch (level) {
    case 1:
      return "text-3xl";
    case 2:
      return "text-2xl";
    case 3:
      return "text-xl";
    case 4:
      return "text-lg";
    case 5:
      return "text-base";
    case 6:
      return "text-sm";
    default:
      return "text-base";
  }
}

function Heading(props: any) {
  const { depth = 1 } = props;
  const level = Math.min(Math.max(depth, 1), 6);
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <MarkdownBlockContainer>
      <Tag className={`text-left font-bold ${getHeadingClasses(level)}`}>
        {props.children}
      </Tag>
    </MarkdownBlockContainer>
  );
}

function Paragraph(props: any) {
  return (
    <MarkdownBlockContainer>
      <div className="text-left">{props.children}</div>
    </MarkdownBlockContainer>
  );
}

function Strong(props: any) {
  // return <span className="font-bold">{props.children}</span>;
  return <strong className="font-bold">{props.children}</strong>;
}

function Emphasis(props: any) {
  return <em>{props.children}</em>;
}

function List(props: any) {
  // console.log("List --- props", props);
  const ListType = props.ordered ? "ol" : "ul";
  return (
    <ListType className="relative px-4 md:px-0 mb-4 w-full max-w-5xl mx-auto space-y-2">
      {props.children}
    </ListType>
  );
}

function ListItem(props: any) {
  // console.log("ListItem ---- props", props);
  const ordered = props.options?.ordered;
  const index = props.options?.index;

  return (
    <li className={`flex [&_ul]:pt-2 [&_ul]:mb-0 [&_ol]:pt-2 [&_ol]:pt-2`}>
      {ordered ? (
        <div className="px-1 text-black">{index + 1}.</div>
      ) : (
        <ListBullet className="text-black" />
      )}
      <div className={`pl-1`}>{props.children}</div>
    </li>
  );
}

function MDImage(props: any) {
  console.log("props", props);

  return (
    <div>
      <img src={props.url} alt={props.alt} title={props.title} />
    </div>
  );
}

function Break(props: any) {
  // console.log("Break ---- props", props);
  return <br />;
}

function ThematicBreak(props: any) {
  // console.log("Break ---- props", props);
  return (
    <MarkdownBlockContainer>
      <hr />
    </MarkdownBlockContainer>
  );
}

function Text(props: any) {
  return <span className="">dummy text</span>;
}

function Link(props: any) {
  return (
    <a
      href={props?.href}
      className="underline text-blue-600 hover:text-blue-700"
    >
      {props.children}
    </a>
  );
}

function MarkdownBlockContainer(props: any) {
  return (
    <div className="relative px-4 md:px-0 w-full max-w-5xl mx-auto">
      {props.children}
    </div>
  );
}

function ListBullet({ className }: { className?: string }) {
  return (
    <svg
      stroke="none"
      fill="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="200px"
      width="200px"
      className={`h-[1lh] w-5.5 shrink-0 ${className}`}
    >
      <circle cx="12.1" cy="12.1" r="3"></circle>
    </svg>
  );
}

function ImageContainer(props: any) {
  const { options } = props;
  if (!options) return null;

  const { images, mode } = options;
  if (!images) return null;

  if (!mode || mode === "list") {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-y-4">
        {images.map((image: any, index: number) => {
          if (image.image_url) {
            return (
              <div key={index} className="">
                <img
                  src={image.image_url}
                  alt={image.alt_text}
                  className="h-full w-full"
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

class Registry implements MileRegistry {
  components: Components = {};

  constructor(user_components?: Components) {
    if (!user_components) {
      return;
    }
    this.registerComponents(builtinComponents);
    this.registerComponents(user_components, true);
  }

  toString() {
    return JSON.stringify(this.components);
  }

  registerComponents(components: Components, is_user_provided?: boolean) {
    if (!components)
      throw new Error("Registering components failed: no components");
    // key and componentData.name must be unique
    for (const key in components) {
      const c = components[key];
      if (!c) throw new Error("Component data not found");
      this.registerComponent(key, c, is_user_provided);
    }
  }

  registerComponent(
    name: string,
    componentData: ComponentData,
    is_user_provided?: boolean,
  ) {
    // key must match component's name
    if (name !== componentData.name) {
      throw new Error(
        `Registering component failed: component data key doesn't match the name ${name} ${JSON.stringify(componentData)}`,
      );
    }
    // name must be unique
    if (this.components[name]) {
      // override existing component if it's a user component
      if (!is_user_provided) {
        throw new Error(`Component '${name}' already exists`);
      }
    }
    this.components[name] = componentData;
    if (is_user_provided) {
      // mark as user component if it's not a markdown tag
      if (!isMarkdown(name)) {
        this.components[name].settings = {
          ...this.components[name].settings,
          isUserComponent: true,
        };
      }
    }
  }

  hasComponent(name: string) {
    let c = this.components[name];
    return !!c;
  }

  getComponent(name: string) {
    let c = this.components[name];
    if (!c) {
      return null;
    }
    return c;
  }

  mustGetComponent(name: string) {
    let c = this.components[name];
    if (!c) {
      throw new Error(`Component data not found: ${name}`);
    }
    return c;
  }
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
