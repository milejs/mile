import { Config } from "@milejs/types";
import { components } from "./components";

export const mileconfig: Config = {
  // actions: {
  //   testAction1(editor: any, payload: { nodeId: string }) {
  //     const { nodeId } = payload;
  //     console.log("testACtion1 editor", editor);
  //     const result = editor.getNode(nodeId);
  //     console.log("result", result);
  //     return {
  //       type: "testAction1",
  //       name: "test action 1",
  //       payload: { nodeId: "s2" },
  //     };
  //   },
  // },
  // custom components
  components,
  // schema of custom components
  schema: [
    {
      type: "home_hero",
      name: "home_hero",
      title: "Home Hero",
      thumbnail: "/mile-thumbnails/hero.png",
      fields: [
        {
          type: "string",
          name: "title",
          title: "Title",
        },
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
        {
          type: "string",
          name: "hours_title",
          title: "Hours Title",
        },
        {
          type: "textarea",
          name: "hours_text",
          title: "Hours Text",
        },
        {
          type: "string",
          name: "contact_title",
          title: "Contact Title",
        },
        {
          type: "textarea",
          name: "contact_text",
          title: "Contact Text",
        },
        {
          type: "string",
          name: "address_title",
          title: "Address Title",
        },
        {
          type: "textarea",
          name: "address_text",
          title: "Address Text",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "home_hero",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "lead",
      name: "lead",
      title: "Lead",
      thumbnail: "/mile-thumbnails/lead.png",
      fields: [
        {
          type: "string",
          name: "title",
          title: "Title",
        },
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "lead",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "banner_blue",
      name: "banner_blue",
      title: "Banner Blue",
      thumbnail: "/mile-thumbnails/banner_blue.png",
      fields: [
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "banner_blue",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "banner_light_blue",
      name: "banner_light_blue",
      title: "Banner Light Blue",
      thumbnail: "/mile-thumbnails/banner_light_blue.png",
      fields: [
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "banner_light_blue",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "media_2_cols",
      name: "media_2_cols",
      title: "Media 2 Cols",
      thumbnail: "/mile-thumbnails/media_2_cols.png",
      fields: [
        {
          type: "string",
          name: "title1",
          title: "Title 1",
        },
        {
          type: "image",
          name: "image1",
          title: "Image 1",
        },
        {
          type: "richtext",
          name: "text1",
          title: "Text 1",
        },
        {
          type: "link",
          name: "link1",
          title: "Link 1",
        },
        {
          type: "string",
          name: "title2",
          title: "Title 2",
        },
        {
          type: "image",
          name: "image2",
          title: "Image 2",
        },
        {
          type: "richtext",
          name: "text2",
          title: "Text 2",
        },
        {
          type: "link",
          name: "link2",
          title: "Link 2",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "media_2_cols",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "carousel_posts",
      name: "carousel_posts",
      title: "Media 2 Cols",
      thumbnail: "/mile-thumbnails/carousel_posts.png",
      fields: [
        {
          type: "number",
          name: "num_posts",
          title: "Number of Posts",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "carousel_posts",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_title",
      name: "condition_title",
      title: "Condition Title",
      thumbnail: "/mile-thumbnails/condition_title.png",
      fields: [
        {
          type: "string",
          name: "title",
          title: "Title",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_title",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "breadcrumb",
      name: "breadcrumb",
      title: "Breadcrumb",
      thumbnail: "/mile-thumbnails/breadcrumb.png",
      fields: [],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "breadcrumb",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_text",
      name: "condition_content_text",
      title: "Condition Text",
      thumbnail: "/mile-thumbnails/condition_content_text.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "string",
          name: "pt",
          title: "Padding Top",
        },
        {
          type: "string",
          name: "pb",
          title: "Padding Bottom",
        },
        {
          type: "string",
          name: "pl",
          title: "Padding Left",
        },
        {
          type: "string",
          name: "pr",
          title: "Padding Right",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_text",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_banner",
      name: "condition_banner",
      title: "Condition Banner",
      thumbnail: "/mile-thumbnails/condition_banner.png",
      fields: [
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "url",
          name: "url",
          title: "Link url",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_banner",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_2_cols_text_image",
      name: "condition_content_2_cols_text_image",
      title: "Condition 2 Cols Text Image",
      thumbnail: "/mile-thumbnails/condition_content_2_cols_text_image.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "url",
          name: "url",
          title: "Link url",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_2_cols_text_image",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_2_cols_blue_banner",
      name: "condition_content_2_cols_blue_banner",
      title: "Condition Blue Banner",
      thumbnail: "/mile-thumbnails/condition_content_2_cols_blue_banner.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "url",
          name: "url",
          title: "Image link url",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_2_cols_blue_banner",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_grid_3",
      name: "condition_content_grid_3",
      title: "Condition Grid 3x1",
      thumbnail: "/mile-thumbnails/condition_content_grid_3.png",
      fields: [
        {
          type: "richtext",
          name: "text0",
          title: "Text 1",
        },
        {
          type: "image",
          name: "image0",
          title: "Image 1",
        },
        {
          type: "url",
          name: "image_url0",
          title: "Image link url 1",
        },
        {
          type: "richtext",
          name: "text1",
          title: "Text 2",
        },
        {
          type: "image",
          name: "image1",
          title: "Image 2",
        },
        {
          type: "url",
          name: "image_url1",
          title: "Image link url 2",
        },
        {
          type: "richtext",
          name: "text2",
          title: "Text 3",
        },
        {
          type: "image",
          name: "image2",
          title: "Image 3",
        },
        {
          type: "url",
          name: "image_url2",
          title: "Image link url 3",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_grid_3",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "resource_banner_grid_3x2",
      name: "resource_banner_grid_3x2",
      title: "Resource Banner Grid 3x2",
      thumbnail: "/mile-thumbnails/resource_banner_grid_3x2.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "ref",
          name: "page_ref",
          title: "Page Reference",
        },
        {
          type: "string",
          name: "banner_title",
          title: "Banner Title",
        },
        {
          type: "textarea",
          name: "banner_excerpt",
          title: "Banner Excerpt",
        },
        {
          type: "image",
          name: "banner_bg_img",
          title: "Banner Background Image",
        },
        {
          type: "link",
          name: "banner_btn_text",
          title: "Banner Button Link",
        },
        {
          type: "richtext",
          name: "text0",
          title: "Item Text 1",
        },
        {
          type: "image",
          name: "image0",
          title: "Item Image 1",
        },
        {
          type: "url",
          name: "image_url0",
          title: "Item Image link url 1",
        },
        {
          type: "richtext",
          name: "text1",
          title: "Item Text 2",
        },
        {
          type: "image",
          name: "image1",
          title: "Item Image 2",
        },
        {
          type: "url",
          name: "image_url1",
          title: "Item Image link url 2",
        },
        {
          type: "richtext",
          name: "text2",
          title: "Item Text 3",
        },
        {
          type: "image",
          name: "image2",
          title: "Item Image 3",
        },
        {
          type: "url",
          name: "image_url2",
          title: "Item Image link url 3",
        },
        {
          type: "richtext",
          name: "text3",
          title: "Item Text 4",
        },
        {
          type: "image",
          name: "image3",
          title: "Item Image 4",
        },
        {
          type: "url",
          name: "image_url3",
          title: "Item Image link url 4",
        },
        {
          type: "richtext",
          name: "text4",
          title: "Item Text 5",
        },
        {
          type: "image",
          name: "image4",
          title: "Item Image 5",
        },
        {
          type: "url",
          name: "image_url4",
          title: "Item Image link url 5",
        },
        {
          type: "richtext",
          name: "text5",
          title: "Item Text 6",
        },
        {
          type: "image",
          name: "image5",
          title: "Item Image 6",
        },
        {
          type: "url",
          name: "image_url5",
          title: "Item Image link url 6",
        },
        {
          type: "link",
          name: "link",
          title: "CTA Link",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "resource_banner_grid_3x2",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_row_button",
      name: "condition_content_row_button",
      title: "Condition Row Button",
      thumbnail: "/mile-thumbnails/condition_content_row_button.png",
      fields: [
        {
          type: "link",
          name: "link",
          title: "Link",
        },
        {
          type: "string",
          name: "align",
          title: "Align",
          description: "left | center | right",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_row_button",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_2_slides",
      name: "condition_content_2_slides",
      title: "Condition 2 Sides",
      thumbnail: "/mile-thumbnails/condition_content_2_slides.png",
      fields: [
        {
          type: "string",
          name: "min_h",
          title: "Min Height",
        },
        {
          type: "string",
          name: "heading0",
          title: "Heading 1",
        },
        {
          type: "image",
          name: "bg_img0",
          title: "BG Image 1",
        },
        {
          type: "link",
          name: "btn_text0",
          title: "Button Link 1",
        },
        {
          type: "string",
          name: "heading1",
          title: "Heading 2",
        },
        {
          type: "image",
          name: "bg_img1",
          title: "BG Image 2",
        },
        {
          type: "link",
          name: "btn_text1",
          title: "Button Link 2",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_2_slides",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_testimonial",
      name: "condition_content_testimonial",
      title: "Condition Testimonial",
      thumbnail: "/mile-thumbnails/condition_content_testimonial.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "image",
          name: "image",
          title: "Image",
        },
        {
          type: "url",
          name: "url",
          title: "URL",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_testimonial",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
    {
      type: "condition_content_cta",
      name: "condition_content_cta",
      title: "Condition CTA",
      thumbnail: "/mile-thumbnails/condition_content_cta.png",
      fields: [
        {
          type: "richtext",
          name: "text",
          title: "Text",
        },
        {
          type: "link",
          name: "link",
          title: "Link",
        },
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "condition_content_cta",
            props: {
              className: "",
            },
            options: undefined,
          },
        };
      },
    },
  ],
};
