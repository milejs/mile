import { Config } from "@milejs/types";
import { components } from "./components";

export const mileconfig: Config = {
  storage: {
    kind: "github",
    repo: "jepezi/test-mile",
  },
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
      ]
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
      ]
    },
    {
      type: "banner_blue",
      name: "banner_blue",
      title: "Banner Blue",
      thumbnail: "/mile-thumbnails/banner_blue.png",
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
      ]
    },
  ],
  // specify your components that will be rendered in editor
  components,
  // pages
  // pages: {
  // 	"/": [
  // 		{
  // 			type: "section",
  // 			id: "s1",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row11",
  // 					props: {className: "mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col111",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h11",
  // 									props: {className: "mi-text-xl mi-text-green-500"},
  // 									options: {},
  // 									children: ["Heading 1"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 		{
  // 			type: "section",
  // 			id: "s2",
  // 			props: {className: "/mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row12",
  // 					props: {className: "/mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col121",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h12",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 2"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 		{
  // 			type: "section",
  // 			id: "s3",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row13",
  // 					props: {className: "mi-flex mi-flex-col sm:mi-flex-row /mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col131",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h13",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 3: 1"],
  // 								},
  // 							],
  // 						},
  // 						{
  // 							type: "column",
  // 							id: "col132",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h23",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 3: 2"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 		{
  // 			type: "section",
  // 			id: "s4",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row14",
  // 					props: {className: "mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col141",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h14",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 4"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 		{
  // 			type: "section",
  // 			id: "s5",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row15",
  // 					props: {className: "mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col151",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h15",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 5"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 		{
  // 			type: "section",
  // 			id: "s6",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row16",
  // 					props: {className: "mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col161",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h16",
  // 									props: {className: "mi-text-xl mi-text-blue-500"},
  // 									options: {},
  // 									children: ["Heading 6"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 	],
  // 	"/about": [
  // 		{
  // 			type: "section",
  // 			id: "s1",
  // 			props: {className: "mi-max-w-5xl mi-mx-auto mi-p-4"},
  // 			options: {},
  // 			children: [
  // 				{
  // 					type: "row",
  // 					id: "row11",
  // 					props: {className: "mi-p-4"},
  // 					options: {},
  // 					children: [
  // 						{
  // 							type: "column",
  // 							id: "col111",
  // 							props: {className: "mi-relative mi-w-full"},
  // 							options: {},
  // 							children: [
  // 								{
  // 									type: "h1",
  // 									id: "h11",
  // 									props: {className: "mi-text-xl mi-text-green-500"},
  // 									options: {},
  // 									children: ["About"],
  // 								},
  // 							],
  // 						},
  // 					],
  // 				},
  // 			],
  // 		},
  // 	],
  // },
};
