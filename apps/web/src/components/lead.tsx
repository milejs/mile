"use client";

import { MileComponentProps, Block, InlineContent } from "@milejs/types";
import { useCreateBlockNote, BlockNoteView } from "@milejs/core";
import cn from "../lib/cn";
import NextLink from "next/link";
import { useEffect, useState } from "react";

/**
 * {
   type: "string",
   name: "title",
   title: "Title",
 },
 {
   type: "image",
   name: "image",
   title: "Image",
 },
 {
   type: "richtext",
   name: "text",
   title: "Text",
 },
 {
   type: "link",
   name: "link",
   title: "Link",
 },
 */
export function Lead(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title, image, text, link } = options ?? {};
  const editor = useCreateBlockNote({
    domAttributes: {
      // Adds a class to all `blockContainer` elements.
      blockContent: {
        class: "hello-world-block",
      },
    },
    initialContent: text,
  });
  useEffect(() => {
    if (text && text.length > 0) {
      editor.replaceBlocks(editor.document, text);
    }
  }, [editor, text]);

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-y-12">
        <div className="">
          <h2 className="text-3xl font-bold">{title ?? "Title goes here"}</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 ">
          <div className="sm:w-1/2">
            <img
              src={image?.image_url ? image.image_url : null}
              alt={image?.alt_text}
              className="w-full"
            />
          </div>
          <div className="sm:w-1/2 text-left">
            <div
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
              <BlockNoteView
                editor={editor}
                editable={false}
                theme="light"
                data-theming-app
              />
              {/*<Richtext data={text} />*/}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RenderInlineContent({
  content,
}: {
  content: InlineContent<any, any>;
}) {
  if (content.type === "text") {
    return content.text;
  }
  if (content.type === "link") {
    return (
      <NextLink href={content.href} className="text-blue-500 hover:underline">
        {content.content.map((e, i) => {
          return <RenderInlineContent key={i} content={e} />;
        })}
      </NextLink>
    );
  }
  return <div>Unknown content</div>;
}

function RenderContent({
  content,
}: {
  content: string | InlineContent<any, any>[];
}) {
  if (typeof content === "string") {
    return content;
  }
  return (
    <>
      {content.map((e, i) => {
        return <RenderInlineContent key={i} content={e} />;
      })}
    </>
  );
}

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "paragraph") {
    return (
      <div className="mb-4">
        <p className="">
          <RenderContent content={block.content} />
        </p>
      </div>
    );
  }
  if (block.type === "heading") {
    const { level, backgroundColor, textColor, textAlignment } = block.props;
    const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    return (
      <div className="mb-4">
        <Tag className="">
          <RenderContent content={block.content} />
        </Tag>
      </div>
    );
  }
}

function Richtext({ data }: { data?: Block[] }) {
  if (!data) return null;

  return (
    <div>
      {data.map((block, index) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function Link(props: any) {
  const { is_external, url, link_text } = props;

  if (is_external) {
    return (
      <a
        href={url ?? "/"}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
      >
        {link_text ?? "Button"}
      </a>
    );
  }

  return (
    <NextLink
      href={url ?? "/"}
      className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
    >
      {link_text ?? "Button"}
    </NextLink>
  );
}
