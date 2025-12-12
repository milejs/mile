import { MileComponentProps } from "@milejs/types";
import { RichtextView } from "@milejs/core/app";
import cn from "../lib/cn";
import { Link } from "./links";

export function Media2Cols(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title1, image1, text1, link1, title2, image2, text2, link2 } =
    options ?? {};

  return (
    <div className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}>
      <div className="max-w-5xl mx-auto flex flex-col gap-y-10 sm:flex-row sm:gap-x-6">
        <Media title={title1} image={image1} text={text1} link={link1} />
        <Media title={title2} image={image2} text={text2} link={link2} />
      </div>
    </div>
  );
}

function Media({ title, image, text, link }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 items-start">
      <div className="w-full order-2 sm:order-1 sm:w-1/2 text-left">
        <h2 className="mb-3 font-bold text-xl/6">{title}</h2>
        <RichtextView blocks={text} className="richtext_media_2_cols_home" />
        {link && <Link {...link} variant="secondary" size="xs" />}
      </div>
      <div className="w-full order-1 sm:orde-2 sm:w-1/2">
        <img
          src={image?.image_url ? image.image_url : null}
          alt={image?.alt_text}
          className="w-full"
        />
      </div>
    </div>
  );
}
