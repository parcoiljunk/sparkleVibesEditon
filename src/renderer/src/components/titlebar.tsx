import { Menu, Minus, Square, X } from "lucide-react"
import { close, minimize, toggleMaximize } from "../lib/electron"
import sparkleLogo from "../../../../resources/sparklelogo.png"

interface TitleBarProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}

function TitleBar({
  onToggleSidebar,
  sidebarCollapsed: _sidebarCollapsed,
}: TitleBarProps): React.ReactElement {
  return (
    <div
      style={{ WebkitAppRegion: "drag" } as any}
      className="h-[50px] fixed top-0 left-0 right-0 flex justify-between items-center pl-4 bg-sparkle-bg/80 backdrop-blur-xl z-50 border-b border-sparkle-border/50"
    >
      <div className="flex items-center gap-3 h-full pr-4">
        <button
          onClick={onToggleSidebar}
          className="h-7 w-7 inline-flex items-center justify-center text-sparkle-text-secondary hover:text-sparkle-primary hover:bg-sparkle-accent transition-all duration-200 rounded-lg"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Menu size={16} />
        </button>
        <div className="relative">
          <img src={sparkleLogo} alt="Sparkle" className="h-5 w-5 relative z-10" />
          <div className="absolute inset-0 bg-sparkle-primary/20 blur-md rounded-full" />
        </div>
        <span className="text-sparkle-text text-sm font-semibold tracking-wide">Sparkle</span>
        <div className="bg-sparkle-primary/10 border border-sparkle-primary/20 px-2 py-0.5 rounded-full text-center text-xs font-medium text-sparkle-primary tracking-wider uppercase">
          Beta
        </div>
      </div>

      <div className="flex" style={{ WebkitAppRegion: "no-drag" } as any}>
        <button
          onClick={minimize}
          className="h-[50px] w-12 inline-flex items-center justify-center text-sparkle-text-secondary hover:text-sparkle-text hover:bg-sparkle-accent/60 transition-all duration-200"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={toggleMaximize}
          className="h-[50px] w-12 inline-flex items-center justify-center text-sparkle-text-secondary hover:text-sparkle-text hover:bg-sparkle-accent/60 transition-all duration-200"
        >
          <Square size={14} />
        </button>
        <button
          onClick={close}
          className="h-[50px] w-12 inline-flex items-center justify-center text-sparkle-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
