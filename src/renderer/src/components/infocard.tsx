import { cn } from "@/lib/utils"
import Card from "./ui/Card"
import { LucideIcon } from "lucide-react"

interface InfoCardItem {
  label: string
  value: string
}

interface InfoCardProps {
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
  title: string
  subtitle?: string
  items?: InfoCardItem[]
  className?: string
  [key: string]: any
}

const InfoCard = ({
  icon: Icon,
  iconBgColor = "bg-blue-500/10",
  iconColor = "text-blue-500",
  title,
  subtitle,
  items = [],
  className,
  ...props
}: InfoCardProps): React.ReactElement => {
  return (
    <Card
      className={cn(
        "bg-sparkle-card/80 backdrop-blur-sm rounded-xl border border-sparkle-border overflow-hidden p-5 transition-all duration-300",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={cn("p-2.5 rounded-xl relative", iconBgColor)}>
          <Icon className={cn("relative z-10", iconColor)} size={22} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-sparkle-text tracking-tight">{title}</h2>
          {subtitle && <p className="text-sparkle-text-secondary text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index}>
            <p className="text-sparkle-text-muted text-xs uppercase tracking-wider font-medium mb-1">
              {item.label}
            </p>
            <p className="text-sparkle-text font-medium text-sm">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default InfoCard
