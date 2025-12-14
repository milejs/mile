"use client";

import React, { useState } from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import NextLink from "next/link";
import { ChevronDownIcon } from "lucide-react";

export function ConditionMainGrid3(props: MileComponentProps) {
  const { options } = props ?? {};
  const {
    text0,
    image0,
    links0,
    text1,
    image1,
    links1,
    text2,
    image2,
    links2,
  } = options ?? {};

  return (
    <div {...props} className={cn(`px-4 sm:px-0 py-5 w-full`, props.className)}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 ">
          {/* Item */}
          <div className="flex flex-col gap-y-6">
            <div className="w-full">
              <ImageNode image={image0} />
            </div>
            <div className="w-full text-center">
              <div className="font-bold text-lg">{text0}</div>
            </div>
            <ConditionLinks
              links={links0}
              label={`Learn more about ${text0}`}
            />
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-6">
            <div className="w-full">
              <ImageNode image={image1} />
            </div>
            <div className="w-full text-center">
              <div className="font-bold text-lg">{text1}</div>
            </div>
            <ConditionLinks
              links={links1}
              label={`Learn more about ${text1}`}
            />
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-6">
            <div className="w-full">
              <ImageNode image={image2} />
            </div>
            <div className="w-full text-center">
              <div className="font-bold text-lg">{text2}</div>
            </div>
            <ConditionLinks
              links={links2}
              label={`Learn more about ${text2}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConditionLinks({ links, label }: { links: any[]; label: string }) {
  if (!links || links.length === 0) return null;
  if (links.length === 1) {
    return (
      <div className="flex flex-col items-center">
        <NextLink
          href={links[0].url}
          className="px-6 py-3 rounded-full text-center bg-blue-100 text-blue-800 hover:text-blue-900 text-sm font-semibold"
        >
          {links[0].link_text}
        </NextLink>
      </div>
    );
  }

  return <ConditionLinksToggle links={links} label={label} />;
}

function ConditionLinksToggle({
  links,
  label,
}: {
  links: any[];
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`px-6 py-3 flex items-center gap-x-2 rounded-full text-center text-blue-800 hover:text-blue-900 text-sm font-semibold ${isOpen ? "bg-slate-100" : "bg-blue-100"} transition-colors duration-300`}
      >
        {label}{" "}
        <ChevronDownIcon
          className={`size-4 ${isOpen ? "rotate-180" : ""} transition-transform duration-300`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}`}
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {links.map((link, index) => (
            <NextLink
              key={index}
              href={link.url}
              className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 hover:text-blue-900 text-sm font-semibold"
            >
              {link.link_text}
            </NextLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageNode({
  image,
}: {
  image?: { image_url: string; alt_text: string };
}) {
  if (!image || !image.image_url) return null;
  return (
    <img
      src={image?.image_url ?? ""}
      alt={image?.alt_text ?? ""}
      className="w-full h-auto"
    />
  );
}
