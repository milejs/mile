import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { RichtextView } from "@milejs/core/app";
import NextLink from "next/link";

function getBgColor(options: any) {
  const { bg_color } = options ?? {};
  if (bg_color) {
    if (bg_color === "gray" || bg_color === "grey") {
      return "bg-zinc-100";
    }
  }
  return "";
}

export function ConditionContentGrid3(props: MileComponentProps) {
  const { options } = props ?? {};
  const {
    text0,
    image0,
    image_url0,
    text1,
    image1,
    image_url1,
    text2,
    image2,
    image_url2,
  } = options ?? {};

  return (
    <div
      {...props}
      className={cn(
        `px-4 sm:px-0 py-5 w-full`,
        getBgColor(options),
        props.className,
      )}
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 ">
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image0} url={image_url0} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text0}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image1} url={image_url1} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text1}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image2} url={image_url2} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text2}
                className="richtext_condition_content"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageNode({
  image,
  url,
}: {
  image?: { image_url: string; alt_text: string };
  url?: string;
}) {
  const img_node = (
    <img
      src={image?.image_url ?? ""}
      alt={image?.alt_text ?? ""}
      className="w-full h-auto"
    />
  );
  return url ? (
    <NextLink href={url} className="">
      {img_node}
    </NextLink>
  ) : (
    img_node
  );
}
