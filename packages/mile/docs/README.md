# Mile

Mile is a CMS Page Builder that supports MDX.

Page data is stored in database where each page's content is stored as a `MDX string`, like below.

```
<Lead />

# This is heading

And this is paragraph

<Footer />
```

Mile exports 2 main components.

1. `<Mile />` will fetch this string and turn it into a Page Builder where you can edit the content.
2. `<App />` will fetch this string and render it as a web page.

## App

```tsx
<App params={params} components={components} />
```

## Mile Editor

```tsx
<Providers>
  <Mile params={params} searchParams={searchParams} />
</Providers>
````

## Mile Config

Out of the box, `<Mile />` understands only markdown. So in a MDX string above, it will be able to understand only the heading and paragraph. To make it understand other components (like `<Lead />` and `<Footer />` above), you need to pass Mile config to `<MileProvider />`.

```tsx
"use client";
import { MileProvider } from "@milejs/core/client";

function Providers({ children }: { children: ReactNode }) {
  return <MileProvider config={mileconfig}>{children}</MileProvider>;
}
```

Mile config contains user components and the corresponding schema.

```tsx
const mileconfig: Config = {
  // user components
  components,
  // schema of user components
  schema: [...]
}
```

#### User Components

`components` is an object with the key and a value of a component data. `name` property of component data must match the key of the component.

Here's the example of the `Lead` component which is used to display a lead section on a page. `Lead` has a title, image, text, and link.

```tsx
// components of mile config
const components = {
  lead: {
    name: "lead",
    component: Lead,
  },
  // You can override built-in components by adding them to the `components` object.
  // e.g. heading, paragraph, etc.
}
```

When Mile is initialized, it will register the user components into the registry and use it to render the preview based on page content.

If the page content is MDX string like above, Mile will parse it into `mdast` and convert it into a `TreeData`, a record of `NodeData`.

#### MDX string

```
<Lead />

# This is heading
```

#### TreeData

```ts
// NodeData of lead
"lead-01": {
  "type": "lead",
  "id": "lead-01",
  "props": {
    "className": ""
  },
  "options": {
    "title": "...",
    "image": {...},
    "link": {...},
    ...
  },
  "children": [],
},

// NodeData of heading
"heading-01": {
  "type": "heading",
  "id": "heading-01",
  "props": {
    "depth": 1
  },
  "options": {},
  "children": ["text-01"],
},
"text-01": {
  "type": "text",
  "id": "text-01",
  "props": {
    "value": "Hi app"
  },
  "options": {},
  "children": [],
}
```

For custom component, the NodeData is straight-forward. The `type` property of NodeData must match the name of the component, which must match `type` and the `getInitialNodeData` in schema below. All the `options` are from `fields` in schema below.

If you want to override Markdown component, like heading, paragraph, etc., see all types in [https://github.com/syntax-tree/mdast](https://github.com/syntax-tree/mdast).

#### Schema

`schema` is an array of objects with the type, name, title, thumbnail, and fields properties. `type` property of schema data must match the name of the component.

`lead` schema below shows 4 fields that `Lead` contains; title, image, text (of type `richtext`), and link (of type `link`). `getInitialNodeData` is a required function that returns the initial data for the component when added in the editor. This initial data must conform to the `NodeData` type.

```tsx
const schema = [
  {
    type: "lead",
    name: "lead",
    title: "Lead",
    thumbnail: "/mile-thumbnails/lead.png",
    fields: [
      {
        type: "string", // built-in type
        name: "title",
        title: "Title",
      },
      {
        type: "image", // built-in type
        name: "image",
        title: "Image",
      },
      {
        type: "richtext", // built-in type
        name: "text",
        title: "Text",
      },
      {
        type: "link", // built-in type
        name: "link",
        title: "Link",
      },
    ],
    getInitialNodeData: (node_id) => ({
      id: node_id,
      type: "lead",
      props: {
        className: "",
      },
      options: undefined,
    }),
  }
]

type NodeData = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  options?: Record<string, unknown>;
  children?: string[]; // array of children's node ids
};
```

### Create Custom Component

Here's how you create custom component like `Lead` in the example. All of the fields can be accessed via `props.options` and you can render them in your custom component. The built-in types for each field are defined as `internalSchema` in `src/mile/client.tsx` file in `@milejs/core` repo.

```tsx
// lead.tsx
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { Richtext } from "./dynamic-richtext";

export function Lead(props: MileComponentProps) {
  const { options } = props ?? {};
  const { title, image, text, link } = options ?? {}; // <-- schema's fields are inside props.options

  return (
    <div
      {...props}
      className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-y-12">
        <div className="">
          <h2 className="text-3xl font-bold">{title ?? "Title goes here"}</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-x-8 gap-y-6 ">
          <div className="sm:w-1/2">
            <img
              src={image?.image_url ? image.image_url : null}
              alt={image?.alt_text}
              className="w-full"
            />
          </div>
          <div className="sm:w-1/2 text-left">
            <Richtext text={text} className="richtext_lead" />
          </div>
        </div>
      </div>
    </div>
  );
}
````

#### Render "richtext" type with BlockNoteView

In the "Lead" component above, the `Richtext` component is used to render the `text` field which is a `"richtext"` type.

The `<Richtext />` uses the `BlockNoteView` component, which you can style using CSS.

## `<App />`

`<App />` is the component that fetch MDX string (page content) and render the web. However, it has no built-in components, by design. Therefore, we have to pass `components` to it. This `components` must contain every possible component used in the whole website, including the markdown components. However, `<App />` uses `MDXRemote` to parse and render the content which uses different parser than `<Mile />` editor. Fortunately, we can use `components` prop to pass the same custom components we used in the `<Mile />` editor. Just import them into this object directly. Make sure their names match the ones in MDX string, which are also used in the `<Mile />` editor. The biggest difference is that the markdown components are parsed differently. Instead of `heading` component, we have to provide `h1`, `h2`, etc. Instead of `paragraph`, we have to provide `p`. See all markdown components here: [https://mdxjs.com/table-of-components/](https://mdxjs.com/table-of-components/)

```tsx
const components = {
  // custom components are the same ones we used in the <Mile /> editor,
  // just import them into this object. Make sure their names match the ones used in the <Mile /> editor.
  Lead,
  Hero,

  // markdown components follows MDX-js.
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
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <MarkdownBlockContainer>
      <p {...props} className="mb-2.5" />
    </MarkdownBlockContainer>
  ),
};
```
