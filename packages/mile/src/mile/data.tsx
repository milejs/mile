import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { visit } from 'unist-util-visit'
import matter from 'gray-matter'
import { generateId } from '@/lib/generate-id';

export async function mdxToTree(source: string) {
  const { content, data } = matter(source);
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml']) // parse `---` frontmatter
    .use(remarkMdx);

  const ast = processor.parse(content);

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
        node.attributes.forEach(attr => {
          // @ts-expect-error .name
          if (!attr.name || attr.name === 'id') return;
          // @ts-expect-error .name
          if (!attr.name || attr.name === 'type') return;
          // @ts-expect-error .name
          if (!attr.name || attr.name === 'options') return;
          if (typeof attr.value === 'string') {
            // @ts-expect-error index
            props[attr.name] = attr.value;
          }
          // Optionally handle expressions here
        })

        // @ts-expect-error not never
        result.content.root.children.push(id);
        // @ts-expect-error index
        result.content[id] = {
          type,
          id,
          props
          // options: undefined // Optional
        }
        break;
      }

      default:
        break;
    }
  })

  return { result, error: undefined };
}