import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Link } from "./links";

export function ConditionContentRowButton(props: MileComponentProps) {
  const { options } = props ?? {};
  const { link, align } = options ?? {};

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-y-12">
        <div className={`${getAlign(align)}`}>
          <Link {...link} variant="secondary" />
        </div>
      </div>
    </div>
  );
}

const getAlign = (align?: string) => {
  switch (align) {
    case "left":
      return "text-left";
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
};
