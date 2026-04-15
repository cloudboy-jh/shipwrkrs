import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer [font-family:var(--sans)]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-[10px] [box-shadow:0_0_0_1px_var(--og),0_4px_16px_var(--og)] hover:[box-shadow:0_0_0_1px_var(--og),0_8px_24px_color-mix(in_srgb,var(--o),transparent_75%)] hover:-translate-y-px",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-[10px]",
        outline:
          "border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground font-semibold rounded-[10px]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent font-semibold rounded-[10px]",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-semibold rounded-[10px]",
        link: "text-primary underline-offset-4 hover:underline font-semibold",
      },
      size: {
        "default": "h-10 px-5 py-2 text-sm",
        "sm": "h-8 px-3 text-xs rounded-[8px]",
        "lg": "h-11 px-8 text-sm",
        "icon": "h-10 w-10",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
