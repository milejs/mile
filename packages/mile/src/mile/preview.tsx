import { NodeData, TreeData } from "@milejs/types";
import { useEffect, useRef, useState } from "react";
import { Loader, PlusIcon } from "lucide-react";
import { useMileProvider } from "./client";
import { createChannel } from "bidc";
import React from "react";

type ChannelPayload =
  | {
      kind: "initial_data";
      data: TreeData;
    }
  | {
      kind: "update_data";
      data: TreeData;
    }
  | {
      kind: "set_active_node_id";
      data: {
        id: string | null;
      };
    };

type PreviewProps = {
  slug: string;
  // data: PageData;
  // data: TreeData | undefined;
  // tree: Tree;
};

export function Preview({ slug }: PreviewProps) {
  const [data, setData] = useState<TreeData | undefined>(undefined);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  useEffect(() => {
    // Create channel for iframe->parent communication
    const channel = createChannel();
    channelRef.current = channel;

    function handlePayload(payload: ChannelPayload) {
      console.log("iframe receive", payload);
      if (payload?.kind === "initial_data") {
        setData(payload.data);
      }
      if (payload?.kind === "update_data") {
        setData(payload.data);
      }
      if (payload?.kind === "set_active_node_id") {
        setActiveNodeId(payload.data.id);
      }
    }

    // Set up message receiver
    channel.receive((payload: any) => {
      handlePayload(payload);
    });

    const timeout = setTimeout(() => {
      setIsConnected(true);
    }, 800);

    return () => {
      clearTimeout(timeout);
      channel.cleanup();
    };
  }, []);

  useEffect(() => {
    async function requestData() {
      if (isConnected) {
        console.log("sync");

        await channelRef.current?.send({ kind: "request_data" });
      }
    }
    requestData();
  }, [isConnected]);

  const sendData = async (data: any) => {
    if (!channelRef.current) return;

    try {
      console.log("send", data);
      await channelRef.current.send(data);
    } catch (error) {
      console.error("Failed to send data:", error);
    }
  };

  if (!data) return <Loader className="animate-spin" />;
  // console.log("Preview data", data);

  return (
    <Container>
      <Render
        data={data}
        sendData={sendData}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
      />
      {isConnected && (
        <div className="fixed top-4 bottom-0 right-0 left-4 w-2 h-2 rounded-full bg-green-600"></div>
      )}
    </Container>
  );
}

function Render({
  data,
  sendData,
  activeNodeId,
  setActiveNodeId,
}: {
  data: TreeData | undefined;
  sendData: (data: any) => Promise<void>;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}) {
  if (!data) return null;
  const root = data.root;
  if (!root) return null;
  // console.log("data", data);

  return (
    <RenderItem
      key={root.id}
      data={data}
      id={root.id}
      parent_id={null}
      sendData={sendData}
      activeNodeId={activeNodeId}
      setActiveNodeId={setActiveNodeId}
    />
  );
}

function RenderItem({
  data,
  id,
  parent_id,
  sendData,
  activeNodeId,
  setActiveNodeId,
}: {
  data: TreeData;
  id: string;
  parent_id: string | null;
  sendData: (data: any) => Promise<void>;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}) {
  const mile = useMileProvider();
  const ref = useRef<HTMLDivElement | null>(null);
  const item = data[id];

  if (item.id === "root") {
    return (
      <div ref={ref} data-id="root">
        {item.children?.map((child_id, i) => {
          const node = data[child_id];
          return (
            <div
              role="button"
              key={`${child_id}_${i}`}
              data-active={activeNodeId === node.id}
              className={`relative w-full data-[active=true]:ring-2 data-[active=true]:ring-blue-500`}
              onClick={() => {
                sendData({
                  kind: "selectNode",
                  data: { id: node.id, type: node.type },
                });
                setActiveNodeId(node.id);
              }}
            >
              <RenderItem
                data={data}
                id={child_id}
                parent_id="root"
                sendData={sendData}
                activeNodeId={activeNodeId}
                setActiveNodeId={setActiveNodeId}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (item.type === "text") {
    const text = item.props?.value;
    if (typeof text !== "string") {
      return null;
    }

    const lines = text.split("\n");
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <RenderComponent
      key={id}
      node={item}
      data={data}
      id={id}
      parent_id={parent_id}
      sendData={sendData}
      activeNodeId={activeNodeId}
      setActiveNodeId={setActiveNodeId}
    />
  );
}

function RenderComponent({
  node,
  data,
  id,
  parent_id,
  sendData,
  activeNodeId,
  setActiveNodeId,
}: {
  node: NodeData;
  data: TreeData;
  id: string;
  parent_id: string | null;
  sendData: (data: any) => Promise<void>;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}) {
  // console.log("render component", node);
  const mile = useMileProvider();
  let c = mile.registry.getComponent(node.type);
  if (!c) throw new Error(`unknown component: ${node.type}`);
  let Comp: React.ComponentType<any> = c.component;
  if (!Comp) {
    throw new Error(`component not found: ${node.type}`);
  }
  // console.log("node", node.type, node, parent_id);
  if (node.type === "listItem") {
    const parent = parent_id ? data[parent_id] : null;
    if (parent) {
      const index = parent.children?.indexOf(node.id);
      if (index != null) {
        node.options = {
          ...node.options,
          ordered: parent.props?.ordered,
          index,
        };
      }
    }
  }

  return (
    <Comp
      data-id={id}
      data-mile-item-id={node.id}
      id={node.id}
      type={node.type}
      {...node.props}
      options={node.options}
    >
      {Array.isArray(node.children)
        ? node.children.map((id, i) => {
            return (
              <RenderItem
                key={`${id}_${i}`}
                data={data}
                id={id}
                parent_id={node.id}
                sendData={sendData}
                activeNodeId={activeNodeId}
                setActiveNodeId={setActiveNodeId}
              />
            );
          })
        : null}
    </Comp>
  );

  // return c.settings?.isInlineContent ? (
  //   element
  // ) : (
  //   <button
  //     data-active={activeNodeId === node.id}
  //     className={`relative w-full data-[active=true]:ring-2 data-[active=true]:ring-blue-500`}
  //     onClick={() => {
  //       sendData({
  //         kind: "selectNode",
  //         data: { id: node.id, type: node.type },
  //       });
  //       setActiveNodeId(node.id);
  //     }}
  //   >
  //     {element}
  //   </button>
  // );
}

function Container({ children }: any) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative" ref={scrollableRef}>
      <div ref={containerRef} className="relative min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
