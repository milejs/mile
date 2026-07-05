import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Link } from "./links";
import NextLink from "next/link";

export function ConditionContent3Slides(props: MileComponentProps) {
  const { options } = props ?? {};
  const {
    heading0,
    heading1,
    heading2,
    bg_img0,
    bg_img1,
    bg_img2,
    btn_text0,
    btn_text1,
    btn_text2,
  } = options ?? {};

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 ">
          {/* Item */}
          <div className="relative w-full sm:w-1/2">
            <ImageNode image={bg_img0} />
            <div className="z-10 absolute inset-0 bg-black/35" />
            <div className="z-20 px-4 absolute inset-0 flex flex-col gap-y-4 justify-center items-center">
              <div className="text-white text-xl font-medium text-center">
                {heading0}
              </div>
              <Link {...btn_text0} variant="secondary" size="sm" />
            </div>
          </div>
          {/* Item */}
          <div className="relative w-full sm:w-1/2">
            <ImageNode image={bg_img1} />
            <div className="z-10 absolute inset-0 bg-black/35" />
            <div className="z-20 px-4 absolute inset-0 flex flex-col gap-y-4 justify-center items-center">
              <div className="text-white text-xl font-medium text-center">
                {heading1}
              </div>
              <Link {...btn_text1} variant="secondary" size="sm" />
            </div>
          </div>
          {/* Item */}
          <div className="relative w-full sm:w-1/2">
            <ImageNode image={bg_img2} />
            <div className="z-10 absolute inset-0 bg-black/35" />
            <div className="z-20 px-4 absolute inset-0 flex flex-col gap-y-4 justify-center items-center">
              <div className="text-white text-xl font-medium text-center">
                {heading2}
              </div>
              <Link {...btn_text2} variant="secondary" size="sm" />
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
  min_h,
}: {
  image?: { image_url: string; alt_text?: string };
  url?: string;
  min_h?: string;
}) {
  const img_node = (
    <img
      src={image?.image_url ?? ""}
      alt={image?.alt_text ?? ""}
      className="w-full h-full object-cover object-center min-h-(--min-h)"
      // style={{ ["--min-h" as string]: min_h }}
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
