import { HomeHero } from "./home_hero";
import { Lead } from "./lead";
import { BannerBlue } from "./banner_blue";
import { BannerLightBlue } from "./banner_light_blue";
import { Media2Cols } from "./media_2_cols";
import { CarouselPosts } from "./carousel_posts";
import { Breadcrumb } from "./breadcrumb";
import { ConditionTitle } from "./condition_title";
import { ConditionContentText } from "./condition_content_text";
import { ConditionBanner } from "./condition_banner";
import { ConditionContent2ColsTextImage } from "./condition_content_2_cols_text_image";
import { ConditionContent2ColsBlueBanner } from "./condition_content_2_cols_blue_banner";
import { ConditionContentGrid3 } from "./condition_content_grid_3";
import { ConditionContentRowButton } from "./condition_content_row_button";
import { ConditionContent2Slides } from "./condition_content_2_slides";
import { ConditionContentCTA } from "./condition_content_cta";
import { ConditionContentTestimonial } from "./condition_content_testimonial";
import { ResourceBannerGrid3x2 } from "./resource_banner_grid_3x2";

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
  condition_title: {
    name: "condition_title",
    component: ConditionTitle,
  },
  breadcrumb: {
    name: "breadcrumb",
    component: Breadcrumb,
  },
  condition_content_text: {
    name: "condition_content_text",
    component: ConditionContentText,
  },
  condition_banner: {
    name: "condition_banner",
    component: ConditionBanner,
  },
  condition_content_2_cols_text_image: {
    name: "condition_content_2_cols_text_image",
    component: ConditionContent2ColsTextImage,
  },
  condition_content_2_cols_blue_banner: {
    name: "condition_content_2_cols_blue_banner",
    component: ConditionContent2ColsBlueBanner,
  },
  condition_content_grid_3: {
    name: "condition_content_grid_3",
    component: ConditionContentGrid3,
  },
  condition_content_row_button: {
    name: "condition_content_row_button",
    component: ConditionContentRowButton,
  },
  condition_content_2_slides: {
    name: "condition_content_2_slides",
    component: ConditionContent2Slides,
  },
  condition_content_cta: {
    name: "condition_content_cta",
    component: ConditionContentCTA,
  },
  condition_content_testimonial: {
    name: "condition_content_testimonial",
    component: ConditionContentTestimonial,
  },
  resource_banner_grid_3x2: {
    name: "resource_banner_grid_3x2",
    component: ResourceBannerGrid3x2,
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
