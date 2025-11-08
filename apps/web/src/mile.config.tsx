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
      type: "hero",
      name: "hero",
      title: "Hero",
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
      ],
      getInitialNodes: (node_id) => {
        return {
          [node_id]: {
            id: node_id,
            type: "hero",
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
  ],
};
