import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";

export function Breadcrumb(props: MileComponentProps) {
  // const { options } = props ?? {};
  // const { title } = options ?? {};

  return (
    <div className={cn(`px-4 sm:px-0 py-5 w-full`, props.className)}>
      <div className="max-w-5xl mx-auto flex flex-row">
        <div className="">breadcrumb</div>
      </div>
    </div>
  );
}
