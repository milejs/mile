import { Hero } from "../../components/hero";
import { Lead } from "../../components/lead_server";
import { BannerBlue } from "../../components/banner_blue_server";

export const components = {
  h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
    <MarkdownBlockContainer>
      <Heading level="1" {...props} />
    </MarkdownBlockContainer>
  ),
  h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
    <MarkdownBlockContainer>
      <Heading level="2" {...props} />
    </MarkdownBlockContainer>
  ),
  h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
    <MarkdownBlockContainer>
      <Heading level="3" {...props} />
    </MarkdownBlockContainer>
  ),
  h4: (props: React.ComponentPropsWithoutRef<"h4">) => (
    <MarkdownBlockContainer>
      <Heading level="4" {...props} />
    </MarkdownBlockContainer>
  ),
  h5: (props: React.ComponentPropsWithoutRef<"h5">) => (
    <MarkdownBlockContainer>
      <Heading level="5" {...props} />
    </MarkdownBlockContainer>
  ),
  h6: (props: React.ComponentPropsWithoutRef<"h6">) => (
    <MarkdownBlockContainer>
      <Heading level="6" {...props} />
    </MarkdownBlockContainer>
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => {
    return (
      <MarkdownBlockContainer>
        <p {...props} className="mb-2.5" />
      </MarkdownBlockContainer>
    );
  },
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <MarkdownBlockContainer>
      <ul {...props} className="list-disc pl-5" />
    </MarkdownBlockContainer>
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ul">) => {
    return (
      <MarkdownBlockContainer>
        <ol {...props} className="list-decimal pl-5" />
      </MarkdownBlockContainer>
    );
  },
  li: (props: React.ComponentPropsWithoutRef<"li">) => {
    return (
      <li {...props} className="/flex">
        <div className="pl-1">{props.children}</div>
      </li>
    );
  },
  Hero,
  Lead,
  BannerBlue,
};

function Heading(
  props: React.ComponentPropsWithoutRef<
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  > & { level: string },
) {
  const { level, ...rest } = props;
  const Tag = `h${level || 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag {...rest} className={`mt-6 mb-4 font-bold ${headingSize(level)}`} />
  );
}

function headingSize(level: string) {
  switch (level) {
    case "1":
      return "text-4xl";
    case "2":
      return "text-3xl";
    case "3":
      return "text-2xl";
    case "4":
      return "text-xl";
    case "5":
      return "text-lg";
    case "6":
      return "text-base";
    default:
      return "text-base";
  }
}

function MarkdownBlockContainer(props: any) {
  return (
    <div className="relative px-4 md:px-0 w-full max-w-5xl mx-auto">
      {props.children}
    </div>
  );
}
