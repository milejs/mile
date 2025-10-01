import { TreeData } from "@milejs/types";
import { useEffect, useRef, useState } from "react";
import { Loader, PlusIcon } from "lucide-react";
import { useMileProvider } from "./client";
import { createChannel } from "bidc"

type ChannelPayload =
  | {
    kind: "initial_data";
    data: TreeData;
  }
  | {
    kind: "update_data";
    data: TreeData;
  };


type PreviewProps = {
  slug: string;
  // data: PageData;
  data: TreeData | undefined;
  // tree: Tree;
}

export function Preview({ slug, data: initialData }: PreviewProps) {
  const [data, setData] = useState<TreeData | undefined>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  useEffect(() => {
    // Create channel for iframe->parent communication
    const channel = createChannel();
    channelRef.current = channel;

    function handlePayload(payload: ChannelPayload) {
      console.log('iframe receive', payload);
      if (payload?.kind === "initial_data") {
        setData(payload.data);
      }
      if (payload?.kind === "update_data") {
        setData(payload.data);
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
    }
  }, []);

  if (!data) return <Loader className="animate-spin" />

  return (
    <Container>
      <Render data={data} />
      {isConnected && (
        <div className="fixed top-4 bottom-0 right-0 left-4 w-2 h-2 rounded-full bg-green-600"></div>
      )}
    </Container>
  );
}

function Render({ data }: { data: TreeData | undefined; }) {
  if (!data) return null;
  const root = data.root;

  return <RenderItem key={root.id} data={data} id={root.id} />;
}

function RenderItem({ data, id }: { data: TreeData; id: string; }) {
  const mile = useMileProvider();
  const ref = useRef<HTMLDivElement | null>(null);
  const item = data[id];

  if (item.id === "root") {
    return (
      <div ref={ref} data-id="root">
        {item.children?.map((id, i) => {
          return <RenderItem key={`${id}_${i}`} data={data} id={id} />;
        })}
      </div>
    );
  }

  if (item.type === "component") {
    return (
      <div className="p-4 bg-zinc-100 flex flex-col justify-center items-center">
        <div className="w-[24px] h-[24px] bg-zinc-400 rounded-full flex items-center justify-center text-lg">
          <PlusIcon color="white" width={12} height={12} />
        </div>
        <div className="">Add component</div>
      </div>
    );
  }

  if (item.type === "text-node") {
    // text node
    return item.children;
  }

  let c = mile.registry.getComponent(item.type);
  if (!c) throw new Error(`unknown component: ${item.type}`);
  let Comp: React.ComponentType<any> = c.component;
  if (!Comp) {
    throw new Error(`component not found: ${item.type}`);
  }
  return (
    <Comp data-id={id} data-mile-item-id={item.id} ref={ref} id={item.id} type={item.type} {...item.props} options={item.options}>
      {Array.isArray(item.children) ? (
        item.children.map((id, i) => {
          return <RenderItem key={`${id}_${i}`} data={data} id={id} />;
        })
      ) : (
        null
      )}
    </Comp>
  );
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
