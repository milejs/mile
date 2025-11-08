import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
// import remarkMdxFrontmatter from "remark-mdx-frontmatter";
// import { visit } from "unist-util-visit";
import matter from "gray-matter";
import { generateId } from "@/lib/generate-id";
import { walk } from "estree-walker";
import { Block, InlineContent as IC, NodeData, TreeData } from "@milejs/types";

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

function convertParagraph(node: NodeData, data: TreeData): BlockNoteBlock {
  return {
    id: node.id,
    type: "paragraph",
    props: {},
    content: extractInlineContent(node, data),
    children: [],
  };
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
 *
 * @param source The MDX source code to convert.
 * @returns The tree structure.
 */
export function mdxToTree(source: string) {
  const { content, data } = matter(source);
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"]) // parse `---` frontmatter
    .use(remarkMdx);

  const ast = processor.parse(content);
  console.log("ast", ast);

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
      case "strong":
      case "emphasis":
      case "blockquote":
      case "image":
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
  if (ast.children) {
    ast.children.forEach((child: any) => {
      processAstNode(child, "root");
    });
  }

  // console.log("data", data);

  const result = {
    ...data,
    content: nodesMap,
  };

  return { result, error: undefined };
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
