import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";

const Root = BaseDialog.Root;
const Trigger = BaseDialog.Trigger;
const Title = BaseDialog.Title;
export { Root as DialogRoot, Trigger as DialogTrigger, Title as DialogTitle };

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
      <BaseDialog.Popup className={`${className}`}>{children}</BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

// <Dialog.Popup className="p-6 fixed top-[40px] bottom-0 /top-1/2 /left-1/2 w-lg max-w-[calc(100vw-3rem)] /-translate-x-1/2 /-translate-y-1/2 /rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 /data-[ending-style]:scale-90 data-[ending-style]:-translate-x-6 data-[ending-style]:opacity-0 /data-[starting-style]:scale-90 data-[starting-style]:-translate-x-6 data-[starting-style]:opacity-0">
// <Dialog.Popup className="flex flex-col fixed top-[calc(50%+20px)] left-1/2 w-full max-w-[calc(100vw-3rem)] h-[calc(100vh*6/7)] -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl bg-zinc-50 text-zinc-900 outline-1 outline-gray-400 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
// <Dialog.Popup className="px-6 py-4 fixed bottom-0 top-1/2 left-1/2 h-[calc(100vh-180px)] w-full max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
// <Dialog.Popup className="px-6 py-4 fixed bottom-0 top-1/2 left-1/2 h-[calc(100vh-180px)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-zinc-50 text-zinc-900 outline-1 outline-zinc-200 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
