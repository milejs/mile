import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { RichtextView } from "@milejs/core/app";

export function ConditionContentText(props: MileComponentProps) {
  const { options } = props ?? {};
  const { text } = options ?? {};

  return (
    <div
      {...props}
      className={cn(
        `px-4 sm:px-0 /py-10 w-full`,
        getPadding(options),
        props.className,
      )}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-y-12">
        <div className="text-left">
          <RichtextView blocks={text} className="richtext_condition_text" />
        </div>
      </div>
    </div>
  );
}

function getPadding(options: any) {
  const { pt, pb, pl, pr } = options ?? {};
  let padding = "";
  if (pt) {
    if (pt === "xs") {
      padding += "pt-2 ";
    } else if (pt === "sm") {
      padding += "pt-4 ";
    } else if (pt === "md") {
      padding += "pt-6 ";
    } else if (pt === "lg") {
      padding += "pt-8 ";
    } else if (pt === "xl") {
      padding += "pt-10 ";
    } else if (pt === "2xl") {
      padding += "pt-22 ";
    } else if (pt === "3xl") {
      padding += "pt-34 ";
    } else if (pt === "4xl") {
      padding += "pt-46 ";
    }
  }
  if (pb) {
    if (pb === "xs") {
      padding += "pb-2 ";
    } else if (pb === "sm") {
      padding += "pb-4 ";
    } else if (pb === "md") {
      padding += "pb-6 ";
    } else if (pb === "lg") {
      padding += "pb-8 ";
    } else if (pb === "xl") {
      padding += "pb-10 ";
    } else if (pb === "2xl") {
      padding += "pb-22 ";
    } else if (pb === "3xl") {
      padding += "pb-34 ";
    } else if (pb === "4xl") {
      padding += "pb-46 ";
    }
  }
  if (pl) {
    if (pl === "xs") {
      padding += "pl-2 ";
    } else if (pl === "sm") {
      padding += "pl-4 ";
    } else if (pl === "md") {
      padding += "pl-6 ";
    } else if (pl === "lg") {
      padding += "pl-8 ";
    } else if (pl === "xl") {
      padding += "pl-10 ";
    } else if (pl === "2xl") {
      padding += "pl-22 ";
    } else if (pl === "3xl") {
      padding += "pl-34 ";
    } else if (pl === "4xl") {
      padding += "pl-46 ";
    }
  }
  if (pr) {
    if (pr === "xs") {
      padding += "pr-2 ";
    } else if (pr === "sm") {
      padding += "pr-4 ";
    } else if (pr === "md") {
      padding += "pr-6 ";
    } else if (pr === "lg") {
      padding += "pr-8 ";
    } else if (pr === "xl") {
      padding += "pr-10 ";
    } else if (pr === "2xl") {
      padding += "pr-22 ";
    } else if (pr === "3xl") {
      padding += "pr-34 ";
    } else if (pr === "4xl") {
      padding += "pr-46 ";
    }
  }
  return padding;
}
