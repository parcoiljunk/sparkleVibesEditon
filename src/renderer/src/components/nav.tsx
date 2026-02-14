import { invoke } from "@/lib/electron"
import { broom } from "@lucide/lab"
import { clsx } from "clsx"
import {
  Box,
  EthernetPort,
  Folder,
  Home,
  Icon,
  LayoutGrid,
  RefreshCw,
  Settings,
  Wrench,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import info from "../../../../package.json"
import useRestartStore from "../store/restartState"
import DiscordIcon from "./discordicon"
import GithubIcon from "./githubicon"
import Button from "./ui/button"
import Modal from "./ui/modal"

const tabIcons = {
  home: <Home size={20} />,
  tweaks: <Wrench size={20} />,
  clean: <Icon iconNode={broom} size={20} />,
  backup: <Folder size={20} />,
  utilities: <Box size={20} />,
  dns: <EthernetPort size={20} />,
  apps: <LayoutGrid size={20} />,
  settings: <Settings size={20} />,
}

const tabs = {
  home: { label: "Dashboard", path: "/" },
  tweaks: { label: "Tweaks", path: "/tweaks" },
  utilities: { label: "Utilities", path: "/utilities" },
  clean: { label: "Cleaner", path: "/clean" },
  backup: { label: "Restore Points", path: "/backup" },
  dns: { label: "DNS Manager", path: "/dns" },
  apps: { label: "Apps", path: "/apps" },
  settings: { label: "Settings", path: "/settings" },
}

function Nav({ collapsed }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { needsRestart } = useRestartStore()

  const tabRefs = useRef<Record<string, HTMLElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
  const [showRestartModal, setShowRestartModal] = useState(false)

  const getActiveTab = () => {
    const path = location.pathname
    if (path === "/") return "home"
    const match = Object.entries(tabs).find(([, { path: p }]) => p === path)
    return match ? match[0] : ""
  }

  const activeTab = getActiveTab()

  useEffect(() => {
    const updateIndicator = () => {
      const ref = tabRefs.current[activeTab]
      const container = containerRef.current
      if (ref && ref instanceof HTMLElement && container) {
        const tabRect = ref.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        setIndicatorStyle({
          top: tabRect.top - containerRect.top,
          height: tabRect.height,
        })
      }
    }
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeTab])

  return (
    <nav
      className={`h-screen text-sparkle-text fixed left-0 top-0 flex flex-col py-6 z-40 transition-all duration-300 ease-in-out ${collapsed ? "w-16" : "w-52"}`}
    >
      <div className="flex-1 flex flex-col gap-1 px-2.5 mt-10 relative" ref={containerRef}>
        {/* Glowing pill indicator */}
        <div
          className="absolute rounded-lg bg-sparkle-primary/10 border border-sparkle-primary/25 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_16px_-4px] shadow-sparkle-primary/20"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            left: "4px",
            right: "4px",
            transition: "top 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s ease",
          }}
        />
        {Object.entries(tabs).map(([id, { label, path }]) => (
          <Button
            variant=""
            key={id}
            ref={(el) => (tabRefs.current[id] = el)}
            onClick={() => navigate(path)}
            className={clsx(
              `flex items-center gap-3 py-2 rounded-lg transition-all duration-200 border relative ${collapsed ? "px-2 justify-center" : "px-3"}`,
              activeTab === id
                ? "border-transparent text-sparkle-primary"
                : "text-sparkle-text-secondary hover:text-sparkle-text border-transparent",
            )}
          >
            <div
              className={clsx("transition-transform duration-200", activeTab === id && "scale-110")}
            >
              {tabIcons[id]}
            </div>
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
            {!collapsed && id === "utilities" && (
              <span className="text-[10px] font-semibold bg-sparkle-primary/15 text-sparkle-primary border border-sparkle-primary/25 px-1.5 py-0.5 rounded-full tracking-wider uppercase">
                New
              </span>
            )}
          </Button>
        ))}
      </div>
      {needsRestart && (
        <button
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 border m-3",
            "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_16px_-4px] hover:shadow-red-500/20",
          )}
          onClick={() => setShowRestartModal(true)}
        >
          <span
            className={`flex text-center items-center gap-2 ${collapsed ? "justify-center" : ""}`}
            title="Restart Windows"
          >
            <RefreshCw size={16} className="animate-spin" style={{ animationDuration: "3s" }} />{" "}
            {!collapsed && <span className="text-sm font-medium">Restart Now</span>}
          </span>
        </button>
      )}
      <Modal open={showRestartModal} onOpenChange={setShowRestartModal}>
        <div className="bg-sparkle-card p-6 rounded-2xl border border-sparkle-border text-sparkle-text w-[90vw] max-w-md">
          <h2 className="text-lg font-semibold">Confirm Restart</h2>
          <p>Are you sure you want to restart your computer now?</p>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setShowRestartModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowRestartModal(false)
                invoke({ channel: "restart" })
              }}
              variant="danger"
            >
              Restart
            </Button>
          </div>
        </div>
      </Modal>
      <div
        className={`flex items-center justify-center gap-3 mt-4 mb-2 ${collapsed ? "flex-col" : ""}`}
      >
        <a
          href="https://github.com/parcoil/sparkle"
          target="_blank"
          className="opacity-50 hover:opacity-100 transition-opacity duration-200"
        >
          <GithubIcon className="w-4.5 fill-sparkle-text-secondary hover:fill-sparkle-primary transition-colors" />
        </a>
        <a
          href="https://discord.com/invite/En5YJYWj3Z"
          target="_blank"
          className="opacity-50 hover:opacity-100 transition-opacity duration-200"
        >
          <DiscordIcon className="w-4.5 fill-sparkle-text-secondary hover:fill-sparkle-primary transition-colors" />
        </a>
      </div>
      <p className="text-sparkle-text-muted text-center text-xs font-mono tracking-wide">
        v{info.version}
      </p>
    </nav>
  )
}

export default Nav
