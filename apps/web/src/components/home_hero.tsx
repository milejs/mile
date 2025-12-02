import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Link } from "./links";
import React from "react";

export function HomeHero(props: MileComponentProps) {
  const { options } = props ?? {};
  const {
    title,
    btn_text,
    link,
    image,
    hours_title,
    hours_text,
    contact_title,
    contact_text,
    address_title,
    address_text,
  } = options ?? {};
  return (
    <div
      {...props}
      className={cn(
        `px-4 sm:px-0 py-10 bg-[image:var(--bg-image)] bg-no-repeat bg-cover bg-center w-full`,
        props.className,
      )}
      style={{ ["--bg-image" as string]: `url(${image?.image_url ?? ""})` }}
    >
      <div className="flex gap-x-10 min-h-[400px] max-w-5xl mx-auto">
        <div className="grow">
          <h1 className="text-5xl leading-15 font-bold text-primary">
            {title ?? "Title goes here"}
          </h1>
        </div>
        <div className="min-w-[100px] sm:min-w-[220px] lg:min-w-[300px] shrink-0">
          <Link {...link} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="px-8 py-7 rounded-lg bg-[#034b56]/45 text-white flex justify-around items-center">
          <Info title={hours_title} text={hours_text} />
          <Info title={contact_title} text={contact_text} />
          <Info title={address_title} text={address_text} />
        </div>
      </div>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  if (!title && !text) return null;

  return (
    <div className="w-1/3 flex flex-col items-left">
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      <div className="text-left text-sm font-medium">
        <NewLineText text={text} />
      </div>
    </div>
  );
}

function NewLineText({ text }: { text: string }) {
  if (typeof text !== "string") {
    return null;
  }

  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}
