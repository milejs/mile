import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Link } from "./links";
import NextLink from "next/link";
import { RichtextView } from "@milejs/core/app";

export function ConditionContent2ColsBlueBanner(props: MileComponentProps) {
  const { options } = props ?? {};
  const { text, link, image, url } = options ?? {};

  const img_node = (
    <img
      src={image?.image_url ?? ""}
      alt={image?.alt ?? ""}
      className="w-full h-auto"
    />
  );
  const image_content = url ? (
    <NextLink href={url} className="">
      {img_node}
    </NextLink>
  ) : (
    img_node
  );

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-y-6 ">
          <div className="px-10 flex flex-col justify-center gap-y-4 sm:w-1/2 bg-[#0C71C3] text-white">
            <RichtextView
              blocks={text}
              className="richtext_condition_blue_banner"
            />
            <div className="text-center">
              <Link {...link} variant="secondary" />
            </div>
          </div>
          <div className="w-full sm:w-1/2">{image_content}</div>
        </div>
      </div>
    </div>
  );
}
