const textareaClasses =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-zinc-300 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-zinc-500 focus-visible:inset-ring-2 focus-visible:inset-ring-zinc-200 focus-visible:shadow-md aria-invalid:ring-destructive/20 aria-invalid:border-destructive";

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <textarea className={textareaClasses} {...props} />;
}
