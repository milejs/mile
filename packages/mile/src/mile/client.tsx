'use client';

import { ComponentData, Components, Config, FieldDefinition, MileClient, MileComponentProps, MileRegistry, MileSchema as MileSchemaType, Schema, SchemaTypeDefinition } from "@milejs/types";
import React, { ComponentType, createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { invariant } from "@/lib/invariant";

export function ClientComponent(props: MileComponentProps) {
  const mile = useMileProvider();
  const { type } = props;
  const c = mile.registry.getComponent(type);
  if (!c) throw new Error(`Render: component not found: ${type}`);
  let Comp: React.ComponentType<any> | undefined;
  if (typeof c.component === "function") {
    console.log("resolving client component for app ======: shared component", type);
    Comp = c.component;
  }
  // if (typeof c.component === "function") {
  //   console.log("resolving client component for app ======: shared component", type);
  //   Comp = c.component;
  // } else {
  //   console.log("resolving client component for app ======: client component", type);
  //   Comp = c.component.client;
  // }
  if (!Comp) {
    console.warn(`Render: skip because component not found: ${type}`);
    return null;
  }
  return <Comp {...props} />;
}

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

class MileSchema implements MileSchemaType {
  user_schema: Schema;
  schema: Schema;
  schemaMap: Map<string, SchemaTypeDefinition | FieldDefinition>;
  constructor(schema: Schema) {
    this.user_schema = schema; // from config.schema
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
    throw new Error("Method not implemented.")
  }
  // resolveField(field: FieldDefinition) {
  //   if (isBuiltinSchemaType(field.type)) {
  //     return field;
  //   } else if (this.schemaMap.has(field.type)) {
  //     const resolvedField = this.schemaMap.get(field.type);
  //     if (!resolvedField) {
  //       throw new Error("Unknown field");
  //     }
  //     return resolvedField;
  //   } else {
  //     throw new Error("Unknown field");
  //   }
  // }
}

// const primitiveTypes = ["string", "number", "boolean", "url", "date", "richtext"];
// function isBuiltinSchemaType(type: string) {
//   return (
//     type === "string" ||
//     type === "number" ||
//     type === "boolean" ||
//     type === "url" ||
//     type === "date" ||
//     type === "richtext"
//   );
// }

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
    ]
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
    ]
  },
]

function initializeSchema(userSchema?: Schema): Schema {
  if (!userSchema) return internalSchema;
  return [...internalSchema, ...userSchema];
}

class Mile implements MileClient {
  config: Config;
  userOptions: any;
  registry: Registry;
  schema: MileSchema;

  constructor(config: Config, optionComponents?: any) {
    this.config = config;
    if (optionComponents) this.userOptions = optionComponents;
    this.registry = new Registry(config?.components);
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

class Registry implements MileRegistry {
  components: Components = {};

  constructor(user_components?: Components) {
    if (!user_components) {
      return;
    }
    this.registerComponents(user_components);
  }

  toString() {
    return JSON.stringify(this.components);
  }

  registerComponents(components: Components) {
    if (!components) throw new Error("Registering components failed: no components");
    // name and componentData.name must be unique
    for (const key in components) {
      const c = components[key];
      if (!c) throw new Error("Component data not found");
      this.registerComponent(key, c);
    }
  }

  registerComponent(name: string, componentData: ComponentData) {
    if (!componentData) {
      throw new Error(`Registering component failed: no component data for ${name}`);
    }
    if (name !== componentData.name) {
      throw new Error(
        `Registering component failed: component data key doesn't match the name ${name} ${JSON.stringify(componentData)}`,
      );
    }
    // name and componentData.name must be unique
    if (this.components[name]) {
      console.warn(`%cComponent '${name}' already exists.`, "color:red;font-size:24px");
    }
    // name and componentData.name must be unique
    for (const key in this.components) {
      const c = this.mustGetComponent(key);
      invariant(key === c.name);
      if (key === name || key === componentData.name) {
        console.warn(`Duplicate component name found: ${key}`);
      }
    }
    this.components[name] = componentData;
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
  // getComponent(name: string, options?: {purpose?: string}) {
  // 	let c = this.components[name];
  // 	if (!c) {
  // 		return null;
  // 	}
  // 	if (name === c.name) {
  // 		// - resolve the shorthand first
  // 		// - resolve purpose
  // 		// - client
  // 		// - do NOT resolve server
  // 		if (typeof c.component === "function") {
  // 			return c.component;
  // 		} else {
  // 			if (options?.purpose === "editor") {
  // 				if (c.component.editor) {
  // 					return c.component.editor;
  // 				}
  // 			}
  // 			if (c.component.client) {
  // 				return c.component.client;
  // 			}
  // 			// if (c.component.server) {
  // 			// 	return c.component.server;
  // 			// }
  // 		}
  // 		return null;
  // 	}
  // }

  // getComponent(name: string) {
  // 	if (this.components[name]) {
  // 		return this.components[name];
  // 	}
  // 	return null;
  // }
}
