import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import Link from "next/link";

export function Hero(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title, btn_text, link, image } = options ?? {};
  return (
    <div
      {...props}
      className={cn(
        `px-4 sm:px-0 py-10 bg-[image:var(--bg-image)] bg-no-repeat bg-cover w-full`,
        props.className,
      )}
      style={{ ["--bg-image" as string]: `url(${image?.image_url ?? ""})` }}
    >
      <div className="flex min-h-[400px] max-w-5xl mx-auto">
        <div className="grow">
          <h1 className="text-6xl font-bold">{title ?? "Title goes here"}</h1>
        </div>
        <div className="min-w-[100px] sm:min-w-[220px] lg:min-w-[300px] shrink-0">
          {link?.is_external ? (
            <a
              href={link?.url ?? "/"}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
            >
              {link?.link_text ?? "Button"}
            </a>
          ) : (
            <Link
              href={link?.url ?? "/"}
              className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
            >
              {link?.link_text ?? "Button"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
