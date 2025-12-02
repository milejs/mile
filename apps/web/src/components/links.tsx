import NextLink from "next/link";

const variant_map = {
  default:
    "inline-flex rounded-full bg-[#0C71C3] hover:bg-[#0967b3] text-white text-center font-semibold",
  outline_light:
    "inline-flex rounded-full bg-transparent hover:bg-white/10 border border-white text-white text-center font-semibold",
  outline_dark:
    "inline-flex rounded-full bg-transparent hover:bg-blue-900/10 border border-blue-900 text-blue-900 text-center font-semibold",
  secondary:
    "inline-flex rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 text-center font-semibold shadow",
};
const size_map = {
  default: "px-6 py-3 text-base",
  sm: "px-4 py-2 text-sm",
  xs: "px-4 py-1.5 text-xs",
};

export function Link({
  is_external,
  url,
  link_text,
  variant,
  size,
}: {
  is_external: boolean;
  url: string;
  link_text: string;
  variant?: "default" | "secondary" | "outline_light" | "outline_dark";
  size?: "default" | "sm";
}) {
  const variantClass = variant_map[variant ?? "default"];
  const sizeClass = size_map[size ?? "default"];

  if (is_external) {
    return (
      <a
        href={url ?? "/"}
        target="_blank"
        rel="noopener noreferrer"
        className={`${variantClass} ${sizeClass}`}
      >
        {link_text ?? "Link text"}
      </a>
    );
  }

  return (
    <NextLink href={url ?? "/"} className={`${variantClass} ${sizeClass}`}>
      {link_text ?? "Link text"}
    </NextLink>
  );
}
