import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { RichtextView } from "@milejs/core/app";

export function ConditionContent2ColsTextImage(props: MileComponentProps) {
  const { options } = props ?? {};
  const { text, url: _url, image } = options ?? {};

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:gap-x-10">
          <div className="w-full sm:w-1/2 text-left">
            <RichtextView
              blocks={text}
              className="richtext_condition_content"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <img
              src={image?.image_url ? image.image_url : null}
              alt={image?.alt_text}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
