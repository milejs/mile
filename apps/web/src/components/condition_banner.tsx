import React from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import NextLink from "next/link";

export function ConditionBanner(props: MileComponentProps) {
  const { options } = props ?? {};
  const { url, image } = options ?? {};
  const img_node = (
    <img
      src={image?.image_url ?? ""}
      alt={image?.alt ?? ""}
      className="w-full h-auto"
    />
  );
  const content = url ? (
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
      {content}
    </div>
  );
}
