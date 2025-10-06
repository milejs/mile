import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { visit } from 'unist-util-visit'
import matter from 'gray-matter'
import { generateId } from '@/lib/generate-id';
import { walk } from 'estree-walker';

export function mdxToTree(source: string) {
  const { content, data } = matter(source);
  // console.log('source', source);
  // console.log('matter', content, data);
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml']) // parse `---` frontmatter
    .use(remarkMdx);

  const ast = processor.parse(content);
  // console.log('ast', ast);

  const result = {
    ...data,
    content: {
      root: {
        type: 'root',
        id: 'root',
        props: {},
        options: {},
        children: [],
      },
    }
  }

  // mutate result object
  visit(ast, (node, index, parent) => {
    switch (node.type) {
      /**
       * "root" | "yaml" | "blockquote" | "break" | "code" | "definition" | "delete" | "emphasis" | "footnoteDefinition" | "footnoteReference" | "heading" | "html" | "image" | "imageReference" | "inlineCode" | "link" | "linkReference" | "list" | "listItem" | "paragraph" | "strong" | "table" | "tableCell" | "tableRow" | "text" | "thematicBreak" | "mdxTextExpression" | "mdxFlowExpression" | "mdxJsxFlowElement" | "mdxJsxTextElement" | "mdxjsEsm"
       */
      case "mdxJsxFlowElement": {
        const { name, attributes } = node;
        // @ts-expect-error .name
        const idAttr = node.attributes.find(attr => attr.name === 'id');
        // @ts-expect-error .name
        const typeAttr = node.attributes.find(attr => attr.name === 'type');
        const id = idAttr && typeof idAttr.value === 'string' ? idAttr.value : generateId();
        const type = typeAttr && typeof typeAttr.value === 'string' ? typeAttr.value : undefined;
        if (type == null) {
          throw new Error("MDX Element has no explicit type attribute");
        }
        const props = {};
        let options = undefined;
        node.attributes.forEach(attr => {
          // @ts-expect-error .name
          if (!attr.name) return;
          // @ts-expect-error .name
          if (attr.name === 'id' || attr.name === 'type') return;
          // @ts-expect-error .name
          if (attr.name === 'options') {
            // @ts-expect-error okk
            if (attr.value?.type === "mdxJsxAttributeValueExpression") {
              // value.value is '{title:"Supreme",image:{image_url:"https://pub-47fe340e22e548e5a8ed17dd964ffa4a.r2.dev/mileupload/2024-drive-the-icons-monterey-car-week-tour-1-jpg",alt_text:""},link:{url:"/contact",link_text:"Book",is_external:false}}'
              // TODO: but we need quote around keys e.g. "title"
              // options = JSON.parse(attr.value.value);
              let extractedObject = null;

              // safety
              if (typeof attr.value === "string") return;
              if (!attr.value.data?.estree) return;

              walk(attr.value.data.estree, {
                enter(node, parent) {
                  // We're looking for the top-level object expression inside an ExpressionStatement
                  if (
                    node.type === 'ExpressionStatement' &&
                    node.expression?.type === 'ObjectExpression'
                  ) {
                    extractedObject = convertObjectExpression(node.expression);
                    // Stop walking once found
                    this.skip();
                  }
                }
              });
              if (extractedObject) {
                options = extractedObject;
              }
            }
            return;
          }
          // other attributes go to props
          if (typeof attr.value === 'string') {
            // @ts-expect-error index
            props[attr.name] = attr.value;
          }
          // Optionally handle expressions here
        });

        // @ts-expect-error not never
        result.content.root.children.push(id);
        // @ts-expect-error index
        result.content[id] = {
          type,
          id,
          props,
          options,
          // options: undefined // Optional
        }
        // console.log('result', result, id, type);
        break;
      }

      default:
        break;
    }
  });

  return { result, error: undefined };
}

function convertObjectExpression(objExpr: any) {
  const result = {};

  for (const prop of objExpr.properties) {
    if (prop.type !== 'Property') continue;

    const key = prop.key.name || prop.key.value; // handle Identifier or Literal keys
    const valueNode = prop.value;

    if (valueNode.type === 'Literal') {
      // @ts-expect-error fine
      result[key] = valueNode.value;
    } else if (valueNode.type === 'ObjectExpression') {
      // @ts-expect-error fine
      result[key] = convertObjectExpression(valueNode); // recurse
    } else {
      // @ts-expect-error fine
      result[key] = null; // or handle other types as needed
    }
  }

  return result;
}
