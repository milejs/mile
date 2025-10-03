import { Components, PageData, TreeData } from "@milejs/types";
// import { Render } from "./render";

export async function App({ params }: { params: Promise<{ mileApp: string[] }>; }) {
  const mileApp = (await params).mileApp;
  const data: PageData = {
    id: "test",
    slug: "test",
    content: {
      root: {
        type: "root",
        id: "root",
        props: {},
        options: {},
        children: ["s1", "s2"],
      },
      s1: {
        type: "hero",
        id: "hero1",
        props: { className: "mi-max-w-5xl mi-mx-auto mi-p-4" },
        options: {},
      },
      s2: {
        type: "featured",
        id: "featured1",
        props: { className: "mi-max-w-5xl mi-mx-auto mi-p-4" },
        options: {},
      },
    }
  }
  // console.log("data", data);
  // console.log("schema", schema);
  if (!data) return <div className="">No content</div>;
  // const content = JSON.parse(data.content as string);
  let content: TreeData = typeof data.content === "string" ? JSON.parse(data.content) : data.content;

  return (
    <div className="">
      {/* <Render data={content ?? []} /> */}
      <div className="">wip</div>
    </div>
  );
}
