"use client";

import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Richtext } from "./DynamicRichtext";

export function Lead(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title, image, text, link } = options ?? {};

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
              <Richtext text={text} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
