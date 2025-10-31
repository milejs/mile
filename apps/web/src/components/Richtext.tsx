"use client";

import { useCreateBlockNote, BlockNoteView } from "@milejs/core";
import { Block } from "@milejs/types";
import { useEffect } from "react";

/**
 * Render richtext type.
 *
 * We use css variables in global.css.
 * Here's example to wrap the Richtext component with css variables in inline style.
 * (But we can use class name too)
 *
 * <div
    style={{
      ["--font-size-h1" as string]: "2rem",
      ["--line-height-h1" as string]: 1.2,
      ["--font-size-h2" as string]: "1.675rem",
      ["--line-height-h2" as string]: 1.3,
      ["--font-size-h3" as string]: "1.475rem",
      ["--line-height-h3" as string]: 1.33,
      ["--font-size-h4" as string]: "1.25rem",
      ["--line-height-h4" as string]: 1.35,
      ["--font-size-h5" as string]: "1.1rem",
      ["--line-height-h5" as string]: 1.36,
      ["--font-size-h6" as string]: "1rem",
      ["--line-height-h6" as string]: 1.37,
    }}
  >
    <Richtext text={text} />
  </div>

 * @param {text} text is richtext
 */
export default function Richtext({
  text,
  className,
}: {
  text: Block[];
  className?: string;
}) {
  const editor = useCreateBlockNote({
    initialContent: text,
  });
  useEffect(() => {
    if (text && text.length > 0) {
      editor.replaceBlocks(editor.document, text);
    }
  }, [editor, text]);

  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      theme="light"
      // see custom class name in global.css
      // these are styles that each instance of Richtext can customize
      className={className}
      // see custom styles with data-theming-app attribute in global.css
      // these are styles that every instance of Richtext will share
      data-theming-app
    />
  );
}
