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
  ],
};
