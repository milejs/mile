import { Block, MileComponentProps } from "@milejs/types";

const CN_BLOCK_MB = "mb-2";
const CN_LI_MB = "mb-1";

// Helper class for block navigation and grouping
class BlockNodes {
  blocks: Block[];
  grouped: any[];
  constructor(blocks: Block[]) {
    this.blocks = blocks;
    this.grouped = this.groupListItems(blocks);
  }

  groupListItems(blocks: Block[]) {
    const result = [];
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];

      if (this.isListItem(block.type)) {
        const listType = this.getListType(block.type);
        const group = { type: listType, items: [], startNumber: null };

        // For numbered lists, capture the start number from the first item
        if (block.type === "numberedListItem" && block.props?.start) {
          // @ts-expect-error okk
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

  isListItem(type: string) {
    return [
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "toggleListItem",
    ].includes(type);
  }

  getListType(itemType: string) {
    const typeMap = {
      bulletListItem: "ul",
      numberedListItem: "ol",
      checkListItem: "checklist",
      toggleListItem: "togglelist",
    };
    // @ts-expect-error okk
    return typeMap[itemType] || "ul";
  }

  prev(index: number) {
    return index > 0 ? this.blocks[index - 1] : null;
  }

  next(index: number) {
    return index < this.blocks.length - 1 ? this.blocks[index + 1] : null;
  }

  parent(block: Block) {
    for (const b of this.blocks) {
      if (b.children && b.children.some((child) => child.id === block.id)) {
        return b;
      }
    }
    return null;
  }

  findIndex(block: Block) {
    return this.blocks.findIndex((b) => b.id === block.id);
  }
}

// Component to render styled text with all formatting
const StyledTextRenderer = ({ styledText }: any) => {
  if (styledText.type !== "text") return null;

  let style = {};
  const styles = styledText.styles || {};
  // @ts-expect-error okk
  if (styles.bold) style.fontWeight = "bold";
  // @ts-expect-error okk
  if (styles.italic) style.fontStyle = "italic";
  // @ts-expect-error okk
  if (styles.underline) style.textDecoration = "underline";
  // @ts-expect-error okk
  if (styles.strike) style.textDecoration = "line-through";
  if (styles.underline && styles.strike)
    // @ts-expect-error okk
    style.textDecoration = "underline line-through";
  if (styles.textColor && styles.textColor !== "default") {
    // @ts-expect-error okk
    style.color = styles.textColor;
  }

  return <span style={style}>{styledText.text}</span>;
};

// Component to render inline content (text, links, custom inline)
const InlineContentRenderer = ({ content }: any) => {
  if (!content || content.length === 0) return null;

  return (
    <>
      {content.map((item: any, index: number) => {
        if (item.type === "link") {
          return (
            <a
              key={index}
              href={item.href}
              style={{ color: "#0066cc", textDecoration: "underline" }}
            >
              {item.content.map((text: any, i: number) => (
                <StyledTextRenderer key={i} styledText={text} />
              ))}
            </a>
          );
        } else if (item.type === "text") {
          return <StyledTextRenderer key={index} styledText={item} />;
        } else {
          // Custom inline content
          return (
            <span key={index} data-type={item.type}>
              {item.content &&
                item.content.map((text: any, i: number) => (
                  <StyledTextRenderer key={i} styledText={text} />
                ))}
            </span>
          );
        }
      })}
    </>
  );
};

// Component to render table content
const TableRenderer = ({ tableContent, props }: any) => {
  const { columnWidths, headerRows = 0, rows } = tableContent;

  return (
    <div style={{ overflowX: "auto", margin: "16px 0" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          border: "1px solid #ddd",
        }}
      >
        <tbody>
          {rows.map((row: any, rowIndex: number) => (
            <tr key={rowIndex}>
              {row.cells.map((cell: any, cellIndex: number) => {
                const CellTag = rowIndex < headerRows ? "th" : "td";
                const cellStyle = {
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: props.textAlignment || "left",
                  backgroundColor:
                    props.backgroundColor ||
                    (rowIndex < headerRows ? "#f5f5f5" : "transparent"),
                  width: columnWidths[cellIndex]
                    ? `${columnWidths[cellIndex]}px`
                    : "auto",
                };

                return (
                  <CellTag
                    key={cellIndex}
                    style={cellStyle}
                    colSpan={cell.props?.colspan}
                    rowSpan={cell.props?.rowspan}
                  >
                    <InlineContentRenderer content={cell.content} />
                  </CellTag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Component to render toggle list items
// const ToggleListItem = ({ block, level }: any) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <li
//       style={{
//         listStyle: "none",
//         marginLeft: level > 0 ? `${level * 20}px` : "0",
//       }}
//     >
//       <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
//         <button
//           onClick={() => setIsOpen(!isOpen)}
//           style={{
//             background: "none",
//             border: "none",
//             cursor: "pointer",
//             padding: "4px",
//             fontSize: "14px",
//           }}
//         >
//           {isOpen ? "▼" : "▶"}
//         </button>
//         <div style={{ flex: 1 }}>
//           <InlineContentRenderer content={block.content} />
//         </div>
//       </div>
//       {isOpen && block.children && block.children.length > 0 && (
//         <div style={{ marginLeft: "24px", marginTop: "8px" }}>
//           <BlocksRenderer blocks={block.children} level={level + 1} />
//         </div>
//       )}
//     </li>
//   );
// };

// Component to render individual blocks
const BlockRenderer = ({ block, level = 0 }: any) => {
  const props = block.props || {};
  const baseStyle = {
    marginLeft: level > 0 ? `${level * 20}px` : "0",
    textAlign: props.textAlignment || "left",
    backgroundColor: props.backgroundColor || "transparent",
    color: props.textColor || "inherit",
  };

  switch (block.type) {
    case "heading": {
      const level = props.level || 1;
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <HeadingTag
          style={baseStyle}
          className={`mb-3 ${getHeadingClassNames(level)}`}
        >
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </HeadingTag>
      );
    }

    case "paragraph":
      return (
        <p style={baseStyle} className={`${CN_BLOCK_MB}`}>
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </p>
      );

    case "quote":
      return (
        <blockquote
          style={{
            ...baseStyle,
            borderLeft: "4px solid #ddd",
            paddingLeft: "16px",
            margin: "16px 0",
            fontStyle: "italic",
            color: "#666",
          }}
        >
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </blockquote>
      );

    case "bulletListItem":
    case "toggleListItem":
      return (
        <li className={`${CN_LI_MB}`}>
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </li>
      );

    case "numberedListItem":
      return (
        <li className={`${CN_LI_MB}`}>
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </li>
      );

    case "checkListItem":
      return (
        <li
          style={{
            listStyle: "none",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
          className={`${CN_LI_MB}`}
        >
          <input
            type="checkbox"
            defaultChecked={props.checked}
            style={{ marginTop: "4px" }}
          />
          <div style={{ flex: 1 }}>
            <InlineContentRenderer content={block.content} />
            {block.children && block.children.length > 0 && (
              <BlocksRenderer blocks={block.children} level={level + 1} />
            )}
          </div>
        </li>
      );

    // case "toggleListItem":
    //   return <ToggleListItem block={block} level={level} />;

    case "image":
      return (
        <figure style={{ ...baseStyle, margin: "16px 0" }}>
          {props.url && (
            <img
              src={props.url}
              alt={props.caption || ""}
              style={{
                maxWidth: props.previewWidth
                  ? `${props.previewWidth}px`
                  : "100%",
                height: "auto",
                display: "block",
              }}
            />
          )}
          {props.caption && (
            <figcaption
              style={{
                fontSize: "14px",
                color: "#666",
                marginTop: "8px",
                textAlign: "center",
              }}
            >
              {props.caption}
            </figcaption>
          )}
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </figure>
      );

    case "video":
      return (
        <figure style={{ ...baseStyle, margin: "16px 0" }}>
          {props.showPreview !== false && props.url && (
            <video
              src={props.url}
              controls
              style={{
                maxWidth: props.previewWidth
                  ? `${props.previewWidth}px`
                  : "100%",
                height: "auto",
                display: "block",
              }}
            />
          )}
          {!props.showPreview && props.url && (
            <a href={props.url} style={{ color: "#0066cc" }}>
              {props.name || props.url}
            </a>
          )}
          {props.caption && (
            <figcaption
              style={{
                fontSize: "14px",
                color: "#666",
                marginTop: "8px",
                textAlign: "center",
              }}
            >
              {props.caption}
            </figcaption>
          )}
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </figure>
      );

    case "table":
      return (
        <div style={baseStyle} className={`${CN_BLOCK_MB}`}>
          <TableRenderer tableContent={block.content} props={props} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </div>
      );

    default:
      return (
        <div
          style={baseStyle}
          data-type={block.type}
          className={`${CN_BLOCK_MB}`}
        >
          <InlineContentRenderer content={block.content} />
          {block.children && block.children.length > 0 && (
            <BlocksRenderer blocks={block.children} level={level + 1} />
          )}
        </div>
      );
  }
};

// Component to render a list of blocks
export const BlocksRenderer = ({ blocks, level = 0, className }: any) => {
  const nodes = new BlockNodes(blocks);

  return (
    <div className={`bn-container bn-mantine ${className}`}>
      <div className="ProseMirror bn-editor bn-default-styles">
        {nodes.grouped.map((item, index) => {
          if (item.type === "ul" || item.type === "ol") {
            const ListTag = item.type;
            const listProps =
              item.type === "ol" && item.startNumber
                ? { start: item.startNumber }
                : {};

            // Get props from first item for list-level styling
            const firstItemProps = item.items[0]?.props || {};
            const listStyle = {
              marginLeft: level > 0 ? `${level * 20}px` : "0",
              textAlign: firstItemProps.textAlignment || "left",
              backgroundColor: firstItemProps.backgroundColor || "transparent",
              color: firstItemProps.textColor || "inherit",
            };

            return (
              <ListTag
                key={index}
                {...listProps}
                style={listStyle}
                className={`list-disc list-inside ${CN_BLOCK_MB}`}
              >
                {item.items.map((block: any) => (
                  <BlockRenderer key={block.id} block={block} level={level} />
                ))}
              </ListTag>
            );
          }

          if (item.type === "checklist") {
            const firstItemProps = item.items[0]?.props || {};
            const listStyle = {
              listStyle: "none",
              padding: 0,
              marginLeft: level > 0 ? `${level * 20}px` : "0",
              textAlign: firstItemProps.textAlignment || "left",
              backgroundColor: firstItemProps.backgroundColor || "transparent",
              color: firstItemProps.textColor || "inherit",
            };

            return (
              <ul
                key={index}
                style={listStyle}
                className={`list-disc list-inside ${CN_BLOCK_MB}`}
              >
                {item.items.map((block: any) => (
                  <BlockRenderer key={block.id} block={block} level={level} />
                ))}
              </ul>
            );
          }

          if (item.type === "togglelist") {
            const firstItemProps = item.items[0]?.props || {};
            const listStyle = {
              listStyle: "none",
              padding: 0,
              marginLeft: level > 0 ? `${level * 20}px` : "0",
              textAlign: firstItemProps.textAlignment || "left",
              backgroundColor: firstItemProps.backgroundColor || "transparent",
              color: firstItemProps.textColor || "inherit",
            };

            return (
              <ul
                key={index}
                style={listStyle}
                className={`list-disc list-inside ${CN_BLOCK_MB}`}
              >
                {item.items.map((block: any) => (
                  <BlockRenderer key={block.id} block={block} level={level} />
                ))}
              </ul>
            );
          }

          return <BlockRenderer key={item.id} block={item} level={level} />;
        })}
      </div>
    </div>
  );
};

function getHeadingClassNames(level: number) {
  switch (level) {
    case 1:
      return "text-3xl font-bold";
    case 2:
      return "text-2xl font-bold";
    case 3:
      return "text-xl font-bold";
    case 4:
      return "text-lg font-bold";
    case 5:
      return "text-base font-bold";
    case 6:
      return "text-sm font-bold";
    default:
      return "text-3xl font-bold";
  }
}
