import { cn } from "@/lib/utils"

function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "bg-sparkle-card/80 backdrop-blur-sm border border-sparkle-border rounded-xl hover:border-sparkle-primary/60 hover:shadow-[0_0_24px_-8px] hover:shadow-sparkle-primary/15 transition-all duration-300 group",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
