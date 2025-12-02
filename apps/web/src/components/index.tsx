import { HomeHero } from "./home_hero";
import { Lead } from "./lead";
import { BannerBlue } from "./banner_blue";
import { BannerLightBlue } from "./banner_light_blue";
import { Media2Cols } from "./media_2_cols";
import { CarouselPosts } from "./carousel_posts";

const components = {
  home_hero: {
    name: "home_hero",
    component: HomeHero,
  },
  lead: {
    name: "lead",
    component: Lead,
  },
  banner_blue: {
    name: "banner_blue",
    component: BannerBlue,
  },
  banner_light_blue: {
    name: "banner_light_blue",
    component: BannerLightBlue,
  },
  media_2_cols: {
    name: "media_2_cols",
    component: Media2Cols,
  },
  carousel_posts: {
    name: "carousel_posts",
    component: CarouselPosts,
  },
  // override built-in markdown component
  heading: {
    name: "heading",
    component: Heading,
  },
  // paragraph: {
  //   name: "paragraph",
  //   component: Paragraph,
  // },
};

// override built-in markdown component
function getHeadingClasses(level: number) {
  switch (level) {
    case 1:
      return "text-3xl";
    case 2:
      return "text-2xl";
    case 3:
      return "text-xl";
    case 4:
      return "text-lg";
    case 5:
      return "text-base";
    case 6:
      return "text-sm";
    default:
      return "text-base";
  }
}

function Heading(props: any) {
  const { depth = 1 } = props;
  const level = Math.min(Math.max(depth, 1), 6);
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <MarkdownBlockContainer>
      <Tag
        className={`mt-6 mb-4 text-left font-bold ${getHeadingClasses(level)}`}
      >
        {props.children}
      </Tag>
    </MarkdownBlockContainer>
  );
}

function Paragraph(props: any) {
  return (
    <MarkdownBlockContainer>
      <p className="text-left mb-2.5">{props.children}</p>
    </MarkdownBlockContainer>
  );
}

function MarkdownBlockContainer(props: any) {
  return (
    <div className="relative px-4 md:px-0 max-w-5xl mx-auto">
      {props.children}
    </div>
  );
}

export { components };
