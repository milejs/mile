"use client";

import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Richtext } from "./dynamic-richtext";
import { Link } from "./links";

export function BannerBlue(props: MileComponentProps) {
  const { options } = props ?? {};
  const { image, text, link } = options ?? {};

  return (
    <div
      className={cn(`px-4 sm:px-0 py-10 w-full bg-blue-800`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-row">
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 items-center">
          <div className="sm:w-1/2 text-left">
            <Richtext text={text} className="richtext_banner_blue" />
            {link && <Link {...link} />}
          </div>
          <div className="sm:w-1/2">
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
