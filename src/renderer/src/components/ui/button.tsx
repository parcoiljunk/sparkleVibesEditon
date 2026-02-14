import { Button as HeadlessButton } from "@headlessui/react"
import clsx from "clsx"

type ButtonSize = "sm" | "md" | "lg"
type ButtonVariant = "primary" | "outline" | "secondary" | "danger" | ""

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-3 text-lg",
}

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  as?: React.ElementType
  [key: string]: any
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  disabled = false,
  as = "button",
  ...props
}) => {
  const base =
    "flex items-center rounded-lg font-medium transition-all duration-200 select-none focus:outline-hidden active:scale-90"

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-sparkle-primary text-sparkle-bg font-semibold hover:shadow-[0_0_20px_-4px] hover:shadow-sparkle-primary/40 hover:brightness-110 border border-sparkle-primary/30",
    outline:
      "border border-sparkle-primary/40 text-sparkle-primary hover:bg-sparkle-primary/10 hover:border-sparkle-primary/60 hover:shadow-[0_0_16px_-4px] hover:shadow-sparkle-primary/20",
    secondary:
      "bg-sparkle-accent/60 border border-sparkle-border text-sparkle-text hover:bg-sparkle-accent hover:border-sparkle-border-secondary",
    danger:
      "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50 hover:shadow-[0_0_16px_-4px] hover:shadow-red-500/20",
    "": "",
  }

  const disabledClasses = "opacity-50 cursor-not-allowed pointer-events-none"

  return (
    <HeadlessButton
      as={as}
      className={clsx(
        base,
        sizes[size as ButtonSize],
        variants[variant as ButtonVariant],
        disabled ? disabledClasses : "",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </HeadlessButton>
  )
}

export default Button
