import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { RichtextView } from "@milejs/core/app";
import NextLink from "next/link";

export function ConditionContentTestimonial(props: MileComponentProps) {
  const { options } = props ?? {};
  const { text, url, image } = options ?? {};

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto">
        <NextLink
          href={url}
          className="bg-zinc-100 px-8 py-6 flex flex-col sm:flex-row sm:gap-x-10"
        >
          <div className="w-full sm:w-[100px] sm:h-[100px] sm:shrink-0">
            <img
              src={image?.image_url ? image.image_url : null}
              alt={image?.alt_text}
              className="rounded-full w-[100px] h-[100px] object-cover border-3 border-zinc-200"
            />
          </div>
          <div className="w-full sm:grow text-left">
            <RichtextView
              blocks={text}
              className="richtext_condition_content"
            />
          </div>
        </NextLink>
      </div>
    </div>
  );
}
