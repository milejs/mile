import { Components, TreeData } from "@milejs/types";
import { ClientComponent } from "./client";

/**
 * not used
 */
export function Render({ data }: { data: TreeData | undefined; }) {
  if (!data) return null;
  const root = data.root;
  return <RenderItem key={root.id} data={data} id={root.id} />;
}

function RenderItem({ data, id }: { data: TreeData; id: string; }) {
  const item = data[id];

  if (item.id === "root") {
    return (
      <div data-id="root">
        {item.children?.map((id, i) => {
          return <RenderItem key={`${id}_${i}`} data={data} id={id} />;
        })}
      </div>
    );
  }

  if (item.type === "text-node") {
    // text node
    return item.children;
  } else {
    // try to find it from client
    return (
      <ClientComponent key={item.id} id={item.id} type={item.type} {...item.props} options={item.options}>
        {Array.isArray(item.children) ? (
          item.children.map((id, i) => {
            return <RenderItem key={`${id}_${i}`} data={data} id={id} />;
          })
        ) : (
          <RenderItem data={data} id={id} />
        )}
      </ClientComponent>
    );
  }
}
