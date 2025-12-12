import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";

export function ConditionTitle(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title } = options ?? {};

  return (
    <div className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}>
      <div className="max-w-5xl mx-auto flex flex-row">
        <div className="">
          <h2 className="text-3xl font-bold">{title ?? "Title goes here"}</h2>
        </div>
      </div>
    </div>
  );
}
