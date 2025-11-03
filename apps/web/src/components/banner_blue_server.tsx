import { MileComponentProps } from "@milejs/types";
import { BlocksRenderer } from "@milejs/core/app";
import cn from "../lib/cn";
import { Link } from "./links";

export async function BannerBlue(props: MileComponentProps) {
  const { options } = props ?? {};
  const { image, text, link } = options ?? {};

  return (
    <div
      className={cn(`px-4 sm:px-0 py-10 w-full bg-blue-800`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-row">
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 items-center">
          <div className="w-full sm:w-1/2 text-left">
            <BlocksRenderer blocks={text} className="richtext_banner_blue" />
            {link && <Link {...link} />}
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
