import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Link } from "./links";
import { RichtextView } from "@milejs/core/app";

export function ConditionContentCTA(props: MileComponentProps) {
  const { options } = props ?? {};
  const { text, link } = options ?? {};

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-y-12">
        <div className="text-left">
          <RichtextView
            blocks={text}
            className="richtext_condition_blue_banner"
          />
        </div>
        <div className="text-center">
          <Link {...link} variant="secondary" />
        </div>
      </div>
    </div>
  );
}
