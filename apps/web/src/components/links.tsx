import NextLink from "next/link";

export function Link({
  is_external,
  url,
  link_text,
}: {
  is_external: boolean;
  url: string;
  link_text: string;
}) {
  if (is_external) {
    return (
      <a
        href={url ?? "/"}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
      >
        {link_text ?? "Link text"}
      </a>
    );
  }

  return (
    <NextLink
      href={url ?? "/"}
      className="block px-6 py-3 rounded-full bg-blue-500 text-white text-center font-semibold text-base"
    >
      {link_text ?? "Link text"}
    </NextLink>
  );
}
