import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5",
        "font-mono text-[10px] font-medium",
        "bg-surface-container-low text-on-surface-variant",
        "border border-border-subtle rounded-md",
        className
      )}
    >
      {children}
    </kbd>
  );
}
