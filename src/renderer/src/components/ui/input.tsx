import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface InputProps {
  type?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  placeholder?: string
  Icon?: LucideIcon
}

function Input({
  type = "text",
  defaultValue,
  onChange,
  className,
  placeholder,
  ...props
}: InputProps): React.ReactElement {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      onChange={onChange}
      className={cn(
        "w-full bg-sparkle-card/80 border border-sparkle-border rounded-lg px-3 py-2 text-sparkle-text",
        "focus:ring-0 focus:outline-hidden focus:border-sparkle-primary/60 focus:shadow-[0_0_12px_-4px] focus:shadow-sparkle-primary/20 transition-all duration-200",
        className,
      )}
      placeholder={placeholder}
      {...props}
    />
  )
}

interface LargeInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: LucideIcon
  className?: string
}

function LargeInput({
  placeholder,
  value,
  onChange,
  icon: Icon,
  className,
  ...props
}: LargeInputProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-sparkle-card/80 border border-sparkle-border",
        "rounded-xl px-4 backdrop-blur-sm transition-all duration-200",
        "focus-within:border-sparkle-primary/60 focus-within:shadow-[0_0_16px_-4px] focus-within:shadow-sparkle-primary/15",
        className,
      )}
    >
      {Icon && <Icon className="w-5 h-5 text-sparkle-text-secondary" />}
      <input
        type="text"
        placeholder={placeholder}
        className={cn(
          "w-full py-3 px-0 bg-transparent border-none",
          "focus:outline-hidden focus:ring-0 text-sparkle-text",
          "placeholder:text-sparkle-text-secondary",
        )}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  )
}

export { Input, LargeInput }
