import { cn } from "@/lib/cn";

export function Icon({
  name,
  filled = false,
  className,
  size,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("material-symbols-outlined", filled && "filled", className)}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
