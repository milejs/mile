// import { unified } from 'unified';
// import remarkParse from 'remark-parse';
// import remarkMdx from 'remark-mdx';
// import remarkFrontmatter from 'remark-frontmatter'
// import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
// import { visit } from 'unist-util-visit'
// import matter from 'gray-matter'
// import { generateId } from '@/lib/generate-id';
// import { walk } from 'estree-walker';

// export function mdxToTree(source: string) {
//   const { content, data } = matter(source);
//   const processor = unified()
//     .use(remarkParse)
//     .use(remarkFrontmatter, ['yaml']) // parse `---` frontmatter
//     .use(remarkMdx);

//   const ast = processor.parse(content);
//   console.log('ast', ast);

//   const result = {
//     ...data,
//     content: {
//       root: {
//         type: 'root',
//         id: 'root',
//         props: {},
//         options: {},
//         children: [],
//       },
//     }
//   }

//   // mutate result object
//   visit(ast, (node, index, parent) => {
//     switch (node.type) {
//       /**
//        * "root" | "yaml" | "blockquote" | "break" | "code" | "definition" | "delete" | "emphasis" | "footnoteDefinition" | "footnoteReference" | "heading" | "html" | "image" | "imageReference" | "inlineCode" | "link" | "linkReference" | "list" | "listItem" | "paragraph" | "strong" | "table" | "tableCell" | "tableRow" | "text" | "thematicBreak" | "mdxTextExpression" | "mdxFlowExpression" | "mdxJsxFlowElement" | "mdxJsxTextElement" | "mdxjsEsm"
//        */
//       case "mdxJsxFlowElement": {
//         const { name, attributes } = node;
//         // @ts-expect-error .name
//         const idAttr = node.attributes.find(attr => attr.name === 'id');
//         // @ts-expect-error .name
//         const typeAttr = node.attributes.find(attr => attr.name === 'type');
//         const id = idAttr && typeof idAttr.value === 'string' ? idAttr.value : generateId();
//         const type = typeAttr && typeof typeAttr.value === 'string' ? typeAttr.value : undefined;
//         if (type == null) {
//           throw new Error("MDX Element has no explicit type attribute");
//         }
//         const props = {};
//         let options = undefined;
//         node.attributes.forEach(attr => {
//           // @ts-expect-error .name
//           if (!attr.name) return;
//           // @ts-expect-error .name
//           if (attr.name === 'id' || attr.name === 'type') return;
//           // @ts-expect-error .name
//           if (attr.name === 'options') {
//             // @ts-expect-error okk
//             if (attr.value?.type === "mdxJsxAttributeValueExpression") {
//               // value.value is '{title:"Supreme",image:{image_url:"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-1-jpg",alt_text:""},link:{url:"/contact",link_text:"Book",is_external:false}}'
//               // TODO: but we need quote around keys e.g. "title"
//               // options = JSON.parse(attr.value.value);
//               let extractedObject = null;

//               // safety
//               if (typeof attr.value === "string") return;
//               if (!attr.value.data?.estree) return;

//               walk(attr.value.data.estree, {
//                 enter(node, parent) {
//                   // We're looking for the top-level object expression inside an ExpressionStatement
//                   if (
//                     node.type === 'ExpressionStatement' &&
//                     node.expression?.type === 'ObjectExpression'
//                   ) {
//                     extractedObject = convertObjectExpression(node.expression);
//                     // Stop walking once found
//                     this.skip();
//                   }
//                 }
//               });
//               if (extractedObject) {
//                 options = extractedObject;
//               }
//             }
//             return;
//           }
//           // other attributes go to props
//           if (typeof attr.value === 'string') {
//             // @ts-expect-error index
//             props[attr.name] = attr.value;
//           }
//           // Optionally handle expressions here
//         });

//         // @ts-expect-error not never
//         result.content.root.children.push(id);
//         // @ts-expect-error index
//         result.content[id] = {
//           type,
//           id,
//           props,
//           options,
//           // options: undefined // Optional
//         }
//         // console.log('result', result, id, type);
//         break;
//       }

//       default:
//         break;
//     }
//   });

//   return { result, error: undefined };
// }

// function convertObjectExpression(objExpr: any) {
//   const result = {};

//   for (const prop of objExpr.properties) {
//     if (prop.type !== 'Property') continue;

//     const key = prop.key.name || prop.key.value; // handle Identifier or Literal keys
//     const valueNode = prop.value;

//     if (valueNode.type === 'Literal') {
//       // @ts-expect-error fine
//       result[key] = valueNode.value;
//     } else if (valueNode.type === 'ObjectExpression') {
//       // @ts-expect-error fine
//       result[key] = convertObjectExpression(valueNode); // recurse
//     } else {
//       // @ts-expect-error fine
//       result[key] = null; // or handle other types as needed
//     }
//   }

//   return result;
// }

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
// import remarkMdxFrontmatter from "remark-mdx-frontmatter";
// import { visit } from "unist-util-visit";
import matter from "gray-matter";
import { generateId } from "@/lib/generate-id";
import { walk } from "estree-walker";

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
      pos: node.position,
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
