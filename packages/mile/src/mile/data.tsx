import matter from "gray-matter";
import { generateId } from "@/lib/generate-id";
import { walk } from "estree-walker";
import {
  Components,
  InlineContent as IC,
  NodeData,
  TreeData,
} from "@milejs/types";

// mdx to mdast tree
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxjs } from "micromark-extension-mdxjs";
import { mdxFromMarkdown } from "mdast-util-mdx";
// mdast tree to mdx
import { toMarkdown } from "mdast-util-to-markdown";
import { mdxToMarkdown } from "mdast-util-mdx";

import JSON5 from "json5";

type BlockNoteBlock = any;
type InlineContent = any;

export function convertNodeDataToBlocks(
  node: NodeData,
  data: TreeData,
): BlockNoteBlock[] {
  // If the node is a container (root), process its children
  if (node.type === "root") {
    const blocks: BlockNoteBlock[] = [];
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childNode = data[childId];
        if (!childNode) continue;
        const convertedBlocks = convertSingleNode(childNode, data);
        blocks.push(...convertedBlocks);
      }
    }
    return blocks;
  }

  // Otherwise, convert the node itself
  return convertSingleNode(node, data);
}

function convertSingleNode(node: NodeData, data: TreeData): BlockNoteBlock[] {
  switch (node.type) {
    case "heading":
      return [convertHeading(node, data)];

    case "paragraph":
      return [convertParagraph(node, data)];

    case "blockquote":
      return [convertBlockquote(node, data)];

    case "list":
      return convertList(node, data);

    case "code":
      return [convertCodeBlock(node)];

    case "image":
      return [convertImage(node, data)];

    case "thematicBreak":
      return [convertThematicBreak(node, data)];

    // Skip these as they're handled by their parents
    case "listItem":
    case "text":
    case "strong":
    case "emphasis":
    case "inlineCode":
    case "link":
      return [];

    default:
      // For unknown types, try to convert as a generic block
      console.warn(`Unknown node type: ${node.type}`);
      return [
        {
          id: node.id,
          type: node.type,
          props: node.props || {},
          content: extractInlineContent(node, data),
          children: [],
        },
      ];
  }
}

function convertHeading(node: NodeData, data: TreeData): BlockNoteBlock {
  const depth = (node.props?.depth as number) || 1;
  const level = Math.min(Math.max(depth, 1), 3); // BlockNote supports levels 1-3

  return {
    id: node.id,
    type: "heading",
    props: {
      level: level,
    },
    content: extractInlineContent(node, data),
    children: [],
  };
}

// TODO: when click on paragraph, the new line has some node.
// maybe log extractInlineContent
function convertParagraph(node: NodeData, data: TreeData): BlockNoteBlock {
  return {
    id: node.id,
    type: "paragraph",
    props: {},
    content: extractInlineContent(node, data),
    children: extractChildrenBlock(node, data),
  };
}

function convertImage(node: NodeData, data: TreeData): BlockNoteBlock {
  console.log("convertImage-----", node);

  return {
    id: node.id,
    type: "image",
    props: {
      url: node.props?.url,
      caption: node.props?.alt,
      previewWidth: node.props?.previewWidth,
    },
    content: undefined,
    children: extractChildrenBlock(node, data),
  };
}

function convertThematicBreak(node: NodeData, data: TreeData): BlockNoteBlock {
  console.log("convertThematicBreak-----", node);

  return {
    id: node.id,
    type: "divider",
    props: {},
    content: undefined,
    children: [],
  };
}

function extractChildrenBlock(
  node: NodeData,
  data: TreeData,
): BlockNoteBlock[] {
  const blocks: BlockNoteBlock[] = [];

  if (!node.children || node.children.length === 0) {
    return [];
  }

  for (const childId of node.children) {
    const childNode = data[childId];
    if (!childNode) continue;
    const extracted = convertSingleNode(childNode, data);
    blocks.push(...extracted);
  }

  return blocks.length > 0 ? blocks : [];
}

function convertBlockquote(node: NodeData, data: TreeData): BlockNoteBlock {
  return {
    id: node.id,
    type: "quote",
    props: {},
    content: extractInlineContent(node, data),
    children: [],
  };
}

function convertCodeBlock(node: NodeData): BlockNoteBlock {
  return {
    id: node.id,
    type: "codeBlock",
    props: {
      language: node.props?.lang || "",
    },
    content: (node.props?.value as string) || "",
    children: [],
  };
}

function convertList(node: NodeData, data: TreeData): BlockNoteBlock[] {
  const isOrdered = node.props?.ordered === true;
  const blocks: BlockNoteBlock[] = [];

  if (!node.children) return blocks;

  for (const childId of node.children) {
    const listItemNode = data[childId];
    if (!listItemNode || listItemNode.type !== "listItem") continue;

    // Check if it's a checklist item
    const isCheckListItem =
      listItemNode.props?.checked !== null &&
      listItemNode.props?.checked !== undefined;

    let blockType: string;
    let props: Record<string, unknown> = {};

    if (isCheckListItem) {
      blockType = "checkListItem";
      props.checked = listItemNode.props?.checked === true;
    } else if (isOrdered) {
      blockType = "numberedListItem";
    } else {
      blockType = "bulletListItem";
    }

    // Extract content from the listItem's children
    // Usually a listItem contains a paragraph with the text content
    let content: InlineContent[] = [];
    let nestedChildren: BlockNoteBlock[] = [];

    if (listItemNode.children && listItemNode.children.length > 0) {
      for (const itemChildId of listItemNode.children) {
        const itemChild = data[itemChildId];
        if (!itemChild) continue;

        if (itemChild.type === "paragraph") {
          // Extract inline content from the paragraph
          content = extractInlineContent(itemChild, data);
        } else if (itemChild.type === "list") {
          // Nested list
          nestedChildren = convertList(itemChild, data);
        }
      }
    }

    blocks.push({
      id: listItemNode.id,
      type: blockType,
      props: props,
      content: content,
      children: nestedChildren,
    });
  }

  return blocks;
}

function extractInlineContent(node: NodeData, data: TreeData): InlineContent[] {
  const inlineContent: InlineContent[] = [];

  if (!node.children || node.children.length === 0) {
    return [{ type: "text", text: "" }];
  }

  for (const childId of node.children) {
    const childNode = data[childId];
    if (!childNode) continue;

    const extracted = extractInlineContentFromNode(childNode, data, {});
    inlineContent.push(...extracted);
  }

  return inlineContent.length > 0
    ? inlineContent
    : [{ type: "text", text: "" }];
}

function extractInlineContentFromNode(
  node: NodeData,
  data: TreeData,
  inheritedStyles: Record<string, boolean>,
): InlineContent[] {
  const result: InlineContent[] = [];

  switch (node.type) {
    case "text":
      result.push({
        type: "text",
        text: (node.props?.value as string) || "",
        ...(Object.keys(inheritedStyles).length > 0
          ? { styles: inheritedStyles }
          : {}),
      });
      break;

    case "break":
      result.push({
        type: "text",
        text: "\n",
        ...(Object.keys(inheritedStyles).length > 0
          ? { styles: inheritedStyles }
          : {}),
      });
      break;

    case "strong":
      if (node.children) {
        for (const childId of node.children) {
          const childNode = data[childId];
          if (childNode) {
            result.push(
              ...extractInlineContentFromNode(childNode, data, {
                ...inheritedStyles,
                bold: true,
              }),
            );
          }
        }
      }
      break;

    case "emphasis":
      if (node.children) {
        for (const childId of node.children) {
          const childNode = data[childId];
          if (childNode) {
            result.push(
              ...extractInlineContentFromNode(childNode, data, {
                ...inheritedStyles,
                italic: true,
              }),
            );
          }
        }
      }
      break;

    case "inlineCode":
      result.push({
        type: "text",
        text: (node.props?.value as string) || "",
        styles: {
          ...inheritedStyles,
          code: true,
        },
      });
      break;

    case "delete":
      if (node.children) {
        for (const childId of node.children) {
          const childNode = data[childId];
          if (childNode) {
            result.push(
              ...extractInlineContentFromNode(childNode, data, {
                ...inheritedStyles,
                strikethrough: true,
              }),
            );
          }
        }
      }
      break;

    case "link":
      const linkText: string[] = [];
      if (node.children) {
        for (const childId of node.children) {
          const childNode = data[childId];
          if (childNode && childNode.type === "text") {
            linkText.push((childNode.props?.value as string) || "");
          }
        }
      }
      result.push({
        type: "link",
        text: linkText.join(""),
        href: (node.props?.href as string) || "",
        ...(Object.keys(inheritedStyles).length > 0
          ? { styles: inheritedStyles }
          : {}),
      });
      break;

    default:
      // For other types, try to process children
      if (node.children) {
        for (const childId of node.children) {
          const childNode = data[childId];
          if (childNode) {
            result.push(
              ...extractInlineContentFromNode(childNode, data, inheritedStyles),
            );
          }
        }
      }
  }

  return result;
}

/**
 * Converts MDX source code into a tree structure.
 */
export function mdxToTree(source: string) {
  const { content, data } = matter(source);
  const mdast = mdxToMdast(content);
  const nodesMap = mdastToTree(mdast);
  const result = {
    ...data,
    content: nodesMap,
  };

  return { result, error: undefined };
}

function mdxToMdast(mdx: string) {
  // --------- old parser
  // const processor = unified()
  //   .use(remarkParse)
  //   .use(remarkFrontmatter, ["yaml"]) // parse `---` frontmatter
  //   .use(remarkMdx);

  // const ast = processor.parse(content);
  // console.log("ast", ast);

  // --------- new parser
  const mdast = fromMarkdown(mdx, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
  // console.log("ast", mdast);
  return mdast;
}

function mdastToTree(mdast: any) {
  const nodesMap: Record<string, any> = {
    root: {
      type: "root",
      id: "root",
      props: {},
      options: {},
      children: [],
    },
  };

  /**
   * Recursively processes an AST node, converts it into our tree format,
   * and adds it to the nodesMap.
   * @param node The current AST node to process.
   * @param parentId The ID of the parent node in our tree.
   * @returns The ID of the newly created node in our tree, or null if skipped.
   */
  function processAstNode(node: any, parentId: string): string | null {
    if (node.type === "yaml") {
      // The yaml frontmatter is handled by gray-matter, so we don't need to
      // create a separate node for it in our content tree.
      return null;
    }

    const generatedId = generateId(); // Generate a unique ID for this node initially

    let currentNode: Record<string, any> = {
      type: node.type,
      id: generatedId,
      props: {},
      options: {},
      children: [],
    };

    let actualNodeId = generatedId; // This will be the ID used in the map and parent's children

    // Process based on node type
    switch (node.type) {
      case "mdxJsxFlowElement": {
        // @ts-expect-error .name
        const idAttr = node.attributes.find((attr) => attr.name === "id");
        // @ts-expect-error .name
        const typeAttr = node.attributes.find((attr) => attr.name === "type");
        const customId =
          idAttr && typeof idAttr.value === "string"
            ? idAttr.value
            : generatedId;
        const type =
          typeAttr && typeof typeAttr.value === "string"
            ? typeAttr.value
            : undefined;

        if (type == null) {
          throw new Error("MDX Element has no explicit type attribute");
        }
        currentNode.id = customId; // Use custom ID if present
        currentNode.type = type;
        actualNodeId = customId; // Update actualNodeId for parent's children and nodesMap key

        node.attributes.forEach((attr: any) => {
          if (!attr.name) return;
          if (attr.name === "id" || attr.name === "type") return;
          if (attr.name === "options") {
            if (attr.value?.type === "mdxJsxAttributeValueExpression") {
              let extractedObject = null;
              if (typeof attr.value === "string") return; // Should not happen for this type
              if (!attr.value.data?.estree) return;

              walk(attr.value.data.estree, {
                enter(walkNode: any, walkParent: any) {
                  if (
                    walkNode.type === "ExpressionStatement" &&
                    walkNode.expression?.type === "ObjectExpression"
                  ) {
                    extractedObject = convertObjectExpression(
                      walkNode.expression,
                    );
                    this.skip();
                  }
                },
              });
              if (extractedObject) {
                currentNode.options = extractedObject;
              }
            }
            return;
          }
          if (typeof attr.value === "string") {
            currentNode.props[attr.name] = attr.value;
          }
          // Optionally handle expressions here, if any other attribute value is an expression
        });
        break;
      }
      case "heading": {
        currentNode.props.depth = node.depth;
        break;
      }
      case "paragraph": {
        break;
      }
      case "list": {
        currentNode.props.ordered = node.ordered;
        currentNode.props.start = node.start;
        currentNode.props.spread = node.spread;
        break;
      }
      case "listItem": {
        currentNode.props.spread = node.spread;
        currentNode.props.checked = node.checked;
        break;
      }
      case "text": {
        currentNode.props.value = node.value;
        break;
      }
      case "inlineCode": {
        currentNode.props.value = node.value;
        break;
      }
      case "code": {
        currentNode.props.value = node.value;
        currentNode.props.lang = node.lang;
        currentNode.props.meta = node.meta;
        break;
      }
      case "link": {
        currentNode.props.href = node.url;
        currentNode.props.title = node.title;
        break;
      }
      case "image": {
        currentNode.props.url = node.url;
        currentNode.props.alt = node.alt;
        currentNode.props.title = node.title;
        currentNode.props.previewWidth = node.previewWidth;
        break;
      }
      case "strong":
      case "emphasis":
      case "blockquote":
      case "thematicBreak":
      case "html": // Might contain raw HTML, needs careful handling if we want to parse it further
      case "break":
      case "delete":
      case "footnoteDefinition":
      case "footnoteReference":
      case "definition":
      case "imageReference":
      case "linkReference":
      case "table":
      case "tableRow":
      case "tableCell":
      case "mdxTextExpression":
      case "mdxFlowExpression":
      case "mdxjsEsm":
        // For other types, we just pass through or add specific properties if needed.
        // Their children will be processed recursively.
        break;
      case "root":
        // This is the AST root, not the content root. It's handled by the initial loop.
        return null;
    }

    nodesMap[actualNodeId] = currentNode;
    nodesMap[parentId].children.push(actualNodeId);

    // Recursively process children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        processAstNode(child, actualNodeId);
      });
    }

    return actualNodeId;
  }

  // Start processing from the AST's children, attaching them to our 'root' content node
  if (mdast.children) {
    mdast.children.forEach((child: any) => {
      processAstNode(child, "root");
    });
  }

  // console.log("data", data);
  // console.log("nodesMap", nodesMap);
  return nodesMap;
}

function convertObjectExpression(objExpr: any) {
  const result: Record<string, any> = {};

  for (const prop of objExpr.properties) {
    if (prop.type !== "Property") continue;

    const key = prop.key.name || prop.key.value; // handle Identifier or Literal keys
    const valueNode = prop.value;

    if (valueNode.type === "Literal") {
      result[key] = valueNode.value;
    } else if (valueNode.type === "ObjectExpression") {
      result[key] = convertObjectExpression(valueNode); // recurse
    } else if (valueNode.type === "Identifier") {
      // Handle identifiers like true, false, null, undefined
      if (valueNode.name === "true") result[key] = true;
      else if (valueNode.name === "false") result[key] = false;
      else if (valueNode.name === "null") result[key] = null;
      else if (valueNode.name === "undefined")
        result[key] = undefined; // Though 'undefined' might not be directly representable in JSON
      else result[key] = valueNode.name; // Fallback for other identifiers
    } else if (valueNode.type === "ArrayExpression") {
      result[key] = valueNode.elements.map((element: any) => {
        if (element.type === "Literal") return element.value;
        if (element.type === "ObjectExpression")
          return convertObjectExpression(element);
        if (element.type === "Identifier") {
          if (element.name === "true") return true;
          if (element.name === "false") return false;
          if (element.name === "null") return null;
          if (element.name === "undefined") return undefined;
          return element.name;
        }
        return null; // Handle other array element types as needed
      });
    } else {
      result[key] = null; // or handle other types as needed
    }
  }

  return result;
}

export function treeToMdx(
  tree: TreeData,
  rootId: string = "root",
  components: Components,
): string {
  const mdast = treeToMdast(tree, rootId, components);
  const str = mdastToString(mdast);
  return str;
}

function mdastToString(mdast: any): string {
  // mdast to string
  // const processor = unified()
  //   .use(remarkStringify)
  //   // .use(remarkFrontmatter, ["yaml"]) // parse `---` frontmatter
  //   .use(remarkMdx);

  // const result = processor.process(mdast);
  // const string = String(result);
  // console.log("string", string);

  const mdxString = toMarkdown(mdast, {
    extensions: [mdxToMarkdown()],
  });
  return mdxString;
}

/**
 * Converts a TreeData structure back into an mdast tree.
 */
function treeToMdast(
  tree: TreeData,
  rootId: string = "root",
  components: Components,
): any {
  const rootNode = tree[rootId];
  if (!rootNode) {
    throw new Error(`Root node with ID ${rootId} not found in tree.`);
  }

  function convertNode(nodeId: string): any {
    const node = tree[nodeId];
    if (!node) return null;

    const children = node.children
      ? node.children.map(convertNode).filter(Boolean)
      : [];

    switch (node.type) {
      case "root":
        return {
          type: "root",
          children,
        };

      case "mdxJsxFlowElement": {
        const attributes = [];
        // Handle id
        if (node.id && node.id !== nodeId) {
          // If the ID in the tree is different from what we might expect or if we want to preserve it explicitly.
          // Let's check props for 'id' first.
        }

        // Convert props to attributes
        for (const [key, value] of Object.entries(node.props || {})) {
          attributes.push({
            type: "mdxJsxAttribute",
            name: key,
            value: value,
          });
        }

        // Handle options object if it exists
        if (node.options && Object.keys(node.options).length > 0) {
          // We need to convert the options object back to an ESTree ObjectExpression
          const objectExpression = objectToEstree(node.options);
          attributes.push({
            type: "mdxJsxAttribute",
            name: "options",
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: JSON5.stringify(node.options),
              data: {
                estree: {
                  type: "Program",
                  body: [
                    {
                      type: "ExpressionStatement",
                      expression: objectExpression,
                    },
                  ],
                  sourceType: "module",
                },
              },
            },
          });
        }

        const C = components[node.type]; // component data

        return {
          type: "mdxJsxFlowElement",
          name: C.component.name, // name of react component
          attributes,
          children,
        };
      }

      case "heading":
        return {
          type: "heading",
          depth: node.props?.depth || 1,
          children,
        };

      case "paragraph":
        return {
          type: "paragraph",
          children,
        };

      case "list":
        return {
          type: "list",
          ordered: node.props?.ordered || false,
          start: node.props?.start,
          spread: node.props?.spread,
          children,
        };

      case "listItem":
        return {
          type: "listItem",
          spread: node.props?.spread,
          checked: node.props?.checked,
          children,
        };

      case "text":
        return {
          type: "text",
          value: node.props?.value || "",
        };

      case "inlineCode":
        return {
          type: "inlineCode",
          value: node.props?.value || "",
        };

      case "code":
        return {
          type: "code",
          lang: node.props?.lang,
          meta: node.props?.meta,
          value: node.props?.value || "",
        };

      case "link":
        return {
          type: "link",
          url: node.props?.href,
          title: node.props?.title,
          children,
        };

      case "image":
        return {
          type: "image",
          url: node.props?.url,
          alt: node.props?.alt,
          title: node.props?.title,
          // previewWidth is custom, might need to be handled if it's standard MD or custom component
        };

      case "blockquote":
        return {
          type: "blockquote",
          children,
        };

      case "thematicBreak":
        return {
          type: "thematicBreak",
        };

      case "break":
        return {
          type: "break",
        };

      case "strong":
        return {
          type: "strong",
          children,
        };

      case "emphasis":
        return {
          type: "emphasis",
          children,
        };

      case "delete":
        return {
          type: "delete",
          children,
        };

      default: {
        // Handle custom components (unknown types) as mdxJsxFlowElement
        const attributes = [];
        console.log("custom node", node);

        // Add id attribute
        if (node.id) {
          attributes.push({
            type: "mdxJsxAttribute",
            name: "id",
            value: node.id,
          });
        }

        // Add type attribute
        attributes.push({
          type: "mdxJsxAttribute",
          name: "type",
          value: node.type,
        });

        // Convert props to attributes
        for (const [key, value] of Object.entries(node.props || {})) {
          if (value === undefined || value === null) continue;
          attributes.push({
            type: "mdxJsxAttribute",
            name: key,
            value: String(value), // Ensure value is string for simple attributes
          });
        }

        // Handle options object if it exists
        if (node.options && Object.keys(node.options).length > 0) {
          const objectExpression = objectToEstree(node.options);
          attributes.push({
            type: "mdxJsxAttribute",
            name: "options",
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: JSON5.stringify(node.options),
              data: {
                estree: {
                  type: "Program",
                  body: [
                    {
                      type: "ExpressionStatement",
                      expression: objectExpression,
                    },
                  ],
                  sourceType: "module",
                },
              },
            },
          });
        }

        const C = components[node.type]; // component data

        return {
          type: "mdxJsxFlowElement",
          name: C.component.name, // name of react component
          attributes,
          children,
        };
      }
    }
  }

  return convertNode(rootId);
}

function objectToEstree(obj: any): any {
  if (obj === null) {
    return { type: "Literal", value: null, raw: "null" };
  }
  if (obj === undefined) {
    return { type: "Identifier", name: "undefined" };
  }
  if (typeof obj === "string") {
    return { type: "Literal", value: obj, raw: JSON.stringify(obj) };
  }
  if (typeof obj === "number") {
    return { type: "Literal", value: obj, raw: String(obj) };
  }
  if (typeof obj === "boolean") {
    return { type: "Literal", value: obj, raw: String(obj) };
  }
  if (Array.isArray(obj)) {
    return {
      type: "ArrayExpression",
      elements: obj.map(objectToEstree),
    };
  }
  if (typeof obj === "object") {
    return {
      type: "ObjectExpression",
      properties: Object.entries(obj).map(([key, value]) => ({
        type: "Property",
        method: false,
        shorthand: false,
        computed: false,
        key: { type: "Identifier", name: key },
        value: objectToEstree(value),
        kind: "init",
      })),
    };
  }
  return { type: "Literal", value: null, raw: "null" }; // Fallback
}

/**
 * Blocks <---> NodeData
 */
function prepareBlocks(blocks: BlockNoteBlock[]) {
  const result = [];
  let i = 0;

  function isListItem(type: string) {
    return [
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      // "toggleListItem",
    ].includes(type);
  }

  function getListType(itemType: string) {
    const typeMap = {
      bulletListItem: "ul",
      numberedListItem: "ol",
      checkListItem: "checklist",
      // toggleListItem: "togglelist",
    };
    // @ts-expect-error okk
    return typeMap[itemType] || "ul";
  }

  while (i < blocks.length) {
    const block = blocks[i];

    if (isListItem(block.type)) {
      const listType = getListType(block.type);
      const group = { type: listType, items: [], startNumber: null };

      // For numbered lists, capture the start number from the first item
      if (block.type === "numberedListItem" && block.props?.start) {
        group.startNumber = block.props.start;
      }

      while (i < blocks.length && block.type === blocks[i].type) {
        // @ts-expect-error okk
        group.items.push(blocks[i]);
        i++;
      }

      result.push(group);
    } else {
      result.push(block);
      i++;
    }
  }

  return result;
}

export function convertBlocksToNodeData(blocks: BlockNoteBlock[]): TreeData {
  const nodesMap: TreeData = {
    root: {
      type: "root",
      id: "root",
      props: {},
      options: {},
      children: [],
    },
  };
  const nodeIds = convertBlocks(blocks, nodesMap);
  nodesMap.root.children!.push(...nodeIds);
  return nodesMap;
}

function convertBlocks(blocks: BlockNoteBlock[], nodesMap: TreeData): string[] {
  const ret = [];
  const nodes = prepareBlocks(blocks);

  // Convert each block and collect ids
  for (const block of nodes) {
    const nodeIds = convertBlockToNodes(block, nodesMap);
    ret.push(...nodeIds);
  }

  return ret;
}

function convertBlockToNodes(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string[] {
  switch (block.type) {
    case "heading":
      return [convertHeadingBlock(block, nodesMap)];

    case "paragraph":
      return [convertParagraphBlock(block, nodesMap)];

    case "quote":
      return [convertBlockquoteBlock(block, nodesMap)];

    case "ul":
    case "ol":
    case "checklist":
      // List items should be wrapped in a list node
      return [convertListBlock(block, nodesMap)];

    case "bulletListItem":
    case "numberedListItem":
    case "checkListItem":
      // List items should be wrapped in a list node
      return convertListItemBlock(block, nodesMap);

    // case "bulletListItem":
    // case "numberedListItem":
    // case "checkListItem":
    //   // List items should be wrapped in a list node
    //   return [convertListItemsToList([block], nodesMap)];

    case "codeBlock":
      return [convertCodeBlockNode(block, nodesMap)];

    case "image":
      return [convertImageBlock(block, nodesMap)];

    case "divider":
      return [convertDividerBlock(block, nodesMap)];

    default:
      console.warn(`Unknown block type: ${block.type}`);
      return [convertGenericBlock(block, nodesMap)];
  }
}

function convertListItemBlock(block: any, nodesMap: TreeData): string[] {
  console.log("block", block);

  const list_item_node: NodeData = {
    id: block.id,
    type: "listItem",
    props: block.props,
    children: [],
  };
  // TODO: check if the block.props line above already handles the checked props (and other props)
  // if (block.type === "checkListItem") {
  //   list_item_node.props!.checked = block.props?.checked || false;
  // }
  if (block.content) {
    // wrap list item content with paragraph
    const paragraph_id = `p-${generateId()}`;
    const paragraph_node: NodeData = {
      id: paragraph_id,
      type: "paragraph",
      props: {},
      children: convertInlineContentToNodes(block.content, nodesMap),
    };
    nodesMap[paragraph_id] = paragraph_node;
    list_item_node.children!.push(paragraph_id);
  }
  // Handle nested children (nested lists)
  if (block.children) {
    const node_ids = convertBlocks(block.children, nodesMap);
    list_item_node.children!.push(...node_ids);
  }

  nodesMap[block.id] = list_item_node;

  return block.id;
}

function convertListBlock(group: any, nodesMap: TreeData): string {
  console.log("group", group);
  const list_id = generateId();

  const list_node = {
    id: list_id,
    type: "list",
    props: {
      ordered: group.type === "ol",
    },
    children: [],
  };
  if (group.items && group.items.length > 0) {
    const list_item_ids = group.items.map((e: any) => {
      console.log("e -------- item", e);

      return convertBlockToNodes(e, nodesMap);
    });
    list_node.children = list_item_ids;
  }
  nodesMap[list_node.id] = list_node;

  return list_id;
}

function convertHeadingBlock(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const headingNode: NodeData = {
    id: block.id,
    type: "heading",
    props: {
      depth: block.props?.level || 1,
    },
    children: [],
  };

  // Convert inline content to text nodes
  if (block.content) {
    headingNode.children = convertInlineContentToNodes(block.content, nodesMap);
  }

  nodesMap[block.id] = headingNode;
  return block.id;
}

function convertParagraphBlock(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const paragraphNode: NodeData = {
    id: block.id,
    type: "paragraph",
    props: {},
    children: [],
  };

  // Convert inline content to text nodes
  if (block.content) {
    paragraphNode.children = convertInlineContentToNodes(
      block.content,
      nodesMap,
    );
  }

  // Handle nested children blocks
  if (block.children && block.children.length > 0) {
    for (const childBlock of block.children) {
      const childIds = convertBlockToNodes(childBlock, nodesMap);
      paragraphNode.children!.push(...childIds);
    }
  }

  nodesMap[block.id] = paragraphNode;
  return block.id;
}

function convertBlockquoteBlock(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const blockquoteNode: NodeData = {
    id: block.id,
    type: "blockquote",
    props: {},
    children: [],
  };

  // Convert inline content to text nodes
  if (block.content) {
    blockquoteNode.children = convertInlineContentToNodes(
      block.content,
      nodesMap,
    );
  }

  nodesMap[block.id] = blockquoteNode;
  return block.id;
}

function convertCodeBlockNode(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const codeNode: NodeData = {
    id: block.id,
    type: "code",
    props: {
      lang: block.props?.language || "",
      value: block.content || "",
    },
    children: [],
  };

  nodesMap[block.id] = codeNode;
  return block.id;
}

function convertImageBlock(block: BlockNoteBlock, nodesMap: TreeData): string {
  const imageNode: NodeData = {
    id: block.id,
    type: "image",
    props: {
      url: block.props?.url,
      alt: block.props?.caption,
      previewWidth: block.props?.previewWidth,
    },
    children: [],
  };

  // Handle nested children blocks if any
  if (block.children && block.children.length > 0) {
    for (const childBlock of block.children) {
      const childIds = convertBlockToNodes(childBlock, nodesMap);
      imageNode.children!.push(...childIds);
    }
  }

  nodesMap[block.id] = imageNode;
  return block.id;
}

function convertDividerBlock(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const dividerNode: NodeData = {
    id: block.id,
    type: "thematicBreak",
    props: {},
    children: [],
  };

  nodesMap[block.id] = dividerNode;
  return block.id;
}

function convertGenericBlock(
  block: BlockNoteBlock,
  nodesMap: TreeData,
): string {
  const node: NodeData = {
    id: block.id,
    type: block.type,
    props: block.props || {},
    children: [],
  };

  if (block.content) {
    node.children = convertInlineContentToNodes(block.content, nodesMap);
  }

  nodesMap[block.id] = node;
  return block.id;
}

function convertInlineContentToNodes(
  content: InlineContent[],
  nodesMap: TreeData,
): string[] {
  const nodeIds: string[] = [];

  for (const item of content) {
    const ids = convertInlineContentItem(item, nodesMap);
    nodeIds.push(...ids);
  }

  return nodeIds;
}

function convertInlineContentItem(
  item: InlineContent,
  nodesMap: TreeData,
): string[] {
  if (item.type === "text") {
    return convertTextWithStyles(item.text, item.styles || {}, nodesMap);
  } else if (item.type === "link") {
    const linkId = `link-${Math.random().toString(36).substr(2, 9)}`;
    const linkNode: NodeData = {
      id: linkId,
      type: "link",
      props: {
        href: item.href,
      },
      children: [],
    };

    // Create text node for link content
    const textId = `text-${Math.random().toString(36).substr(2, 9)}`;
    const textNode: NodeData = {
      id: textId,
      type: "text",
      props: {
        value: item.text,
      },
    };
    nodesMap[textId] = textNode;
    linkNode.children!.push(textId);

    nodesMap[linkId] = linkNode;
    return [linkId];
  }

  return [];
}

function convertTextWithStyles(
  text: string,
  styles: Record<string, boolean>,
  nodesMap: TreeData,
): string[] {
  // Handle line breaks
  if (text === "\n") {
    const breakId = `break-${Math.random().toString(36).substr(2, 9)}`;
    nodesMap[breakId] = {
      id: breakId,
      type: "break",
      props: {},
    };
    return [breakId];
  }

  // everything else will be wrapped in paragraph

  // Create text node
  const textId = `text-${Math.random().toString(36).substr(2, 9)}`;
  const textNode: NodeData = {
    id: textId,
    type: "text",
    props: {
      value: text,
    },
  };
  nodesMap[textId] = textNode;

  // const paragraphId = `paragraph-${Math.random().toString(36).substr(2, 9)}`;
  // const paragraphNode: NodeData = {
  //   id: paragraphId,
  //   type: "paragraph",
  //   props: {},
  //   children: [textId],
  // };
  // nodesMap[paragraphId] = paragraphNode;

  let currentId = textId;

  // Wrap with style nodes
  if (styles.bold) {
    const strongId = `strong-${Math.random().toString(36).substr(2, 9)}`;
    nodesMap[strongId] = {
      id: strongId,
      type: "strong",
      props: {},
      children: [currentId],
    };
    currentId = strongId;
  }

  if (styles.italic) {
    const emphasisId = `emphasis-${Math.random().toString(36).substr(2, 9)}`;
    nodesMap[emphasisId] = {
      id: emphasisId,
      type: "emphasis",
      props: {},
      children: [currentId],
    };
    currentId = emphasisId;
  }

  if (styles.strikethrough) {
    const deleteId = `delete-${Math.random().toString(36).substr(2, 9)}`;
    nodesMap[deleteId] = {
      id: deleteId,
      type: "delete",
      props: {},
      children: [currentId],
    };
    currentId = deleteId;
  }

  if (styles.code) {
    // For inline code, we need to replace the text node with an inlineCode node
    delete nodesMap[textId];
    const inlineCodeId = `inlineCode-${Math.random().toString(36).substr(2, 9)}`;
    nodesMap[inlineCodeId] = {
      id: inlineCodeId,
      type: "inlineCode",
      props: {
        value: text,
      },
    };
    currentId = inlineCodeId;
  }

  return [currentId];
}
