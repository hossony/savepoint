import { AVATAR_COLORS, cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl md:size-28 md:text-4xl",
};

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white select-none",
        AVATAR_COLORS[color] ?? AVATAR_COLORS.blue,
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
