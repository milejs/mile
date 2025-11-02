import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Richtext } from "./dynamic-richtext";

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
          <div className="w-full sm:w-1/2">
            <img
              src={image?.image_url ? image.image_url : null}
              alt={image?.alt_text}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-1/2 text-left">
            <Richtext text={text} className="richtext_lead" />
          </div>
        </div>
      </div>
    </div>
  );
}
