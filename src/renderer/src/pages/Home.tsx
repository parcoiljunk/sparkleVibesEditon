import { useState, useEffect } from "react"
import RootDiv from "@/components/rootdiv"
import {
  Cpu,
  HardDrive,
  Zap,
  MemoryStick,
  MonitorCog,
  Wrench,
  Activity,
  Gpu,
  Shield,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import useSystemStore from "@/store/systemInfo"
import log from "electron-log/renderer"
import Greeting from "@/components/greeting"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════
// SPARKLINE CHART
// ═══════════════════════════════════════════════════
const Sparkline = ({ data, color = "#22d3ee", height = 40, id = "default" }) => {
  if (!data || data.length < 2) return null
  const max = 100
  const min = 0
  const width = 100

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d - min) / (max - min)) * height
      return `${x},${y}`
    })
    .join(" ")

  const areaPath = `M0,${height} L${data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d - min) / (max - min)) * height
      return `${x},${y}`
    })
    .join(" L")} L${width},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#area-grad-${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════
// CIRCULAR GAUGE
// ═══════════════════════════════════════════════════
const CircularGauge = ({ value = 0, color = "#22d3ee", size = 64, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-sparkle-border/40"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════
// USAGE CARD
// ═══════════════════════════════════════════════════
const UsageCard = ({ title, value, icon: Icon, data, color, subtext, delay = 0 }) => {
  const getStatusColor = (v: number) => {
    if (v > 90) return "text-red-400"
    if (v > 70) return "text-yellow-400"
    return "text-sparkle-text"
  }

  return (
    <div
      className="animate-fade-slide-up relative overflow-hidden rounded-2xl border border-sparkle-border/30 bg-sparkle-card/40 backdrop-blur-md transition-all duration-500 hover:bg-sparkle-card/60 hover:border-sparkle-primary/25 hover:shadow-[0_8px_40px_-12px] hover:shadow-sparkle-primary/10 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl"
          style={{ background: `${color}08` }}
        />
      </div>

      <div className="p-5 pb-0 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-sparkle-accent/80 border border-sparkle-border/30">
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-sparkle-text-secondary/70">
                {title}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-3xl font-bold font-mono tabular-nums transition-colors",
                  getStatusColor(value),
                )}
              >
                {Math.round(value)}
              </span>
              <span className="text-sm text-sparkle-text-muted font-medium">%</span>
            </div>
          </div>

          <div className="relative">
            <CircularGauge value={value} color={color} size={52} strokeWidth={4} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold font-mono text-sparkle-text-secondary">
                {Math.round(value)}
              </span>
            </div>
          </div>
        </div>

        {subtext && (
          <p className="text-[10px] text-sparkle-text-muted/50 font-mono mt-1 truncate max-w-[180px]">
            {subtext}
          </p>
        )}
      </div>

      <div className="h-14 w-full mt-3 relative opacity-60 group-hover:opacity-100 transition-opacity duration-500">
        <Sparkline data={data} color={color} height={56} id={title} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// QUICK NAV CARD
// ═══════════════════════════════════════════════════
const QuickNavCard = ({ icon: Icon, title, description, onClick, color, delay = 0 }) => (
  <button
    onClick={onClick}
    className="animate-fade-slide-up group relative overflow-hidden rounded-xl border border-sparkle-border/30 bg-sparkle-card/30 p-4 text-left backdrop-blur-sm transition-all duration-300 hover:bg-sparkle-card/50 hover:border-sparkle-primary/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center gap-3">
      <div
        className="p-2 rounded-lg border border-sparkle-border/30"
        style={{ background: `${color}15` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-sparkle-text group-hover:text-sparkle-primary transition-colors">
          {title}
        </h4>
        <p className="text-[11px] text-sparkle-text-muted truncate">{description}</p>
      </div>
      <ChevronRight
        size={16}
        className="text-sparkle-text-muted/40 group-hover:text-sparkle-primary group-hover:translate-x-0.5 transition-all"
      />
    </div>
  </button>
)

// ═══════════════════════════════════════════════════
// SPEC ROW
// ═══════════════════════════════════════════════════
const SpecRow = ({ icon: Icon, label, value, color = "text-sparkle-primary" }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-sparkle-border/20 last:border-0 group/row hover:bg-sparkle-accent/20 -mx-2 px-2 rounded-lg transition-colors">
    <div className={cn("p-1.5 rounded-md bg-sparkle-accent/50", color)}>
      <Icon size={12} />
    </div>
    <span className="text-xs text-sparkle-text-secondary font-medium flex-1">{label}</span>
    <span
      className="text-xs text-sparkle-text font-semibold text-right max-w-[55%] truncate font-mono"
      title={String(value)}
    >
      {value}
    </span>
  </div>
)

// ═══════════════════════════════════════════════════
// HOME PAGE COMPONENT
// ═══════════════════════════════════════════════════
function Home() {
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const router = useNavigate()

  const [loading, setLoading] = useState(true)
  const [activeTweaks, setActiveTweaks] = useState<any[]>([])

  const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(30).fill(0))
  const [ramHistory, setRamHistory] = useState<number[]>(new Array(30).fill(0))
  const [diskHistory, setDiskHistory] = useState<number[]>(new Array(30).fill(0))
  const [currentStats, setCurrentStats] = useState({ cpu: 0, ram: 0, disk: 0 })
  const [uptime, setUptime] = useState("")

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 GB"
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB"
  }

  const formatUptime = () => {
    const totalSec = Math.floor(performance.now() / 1000)
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const fetchActiveTweaks = async () => {
    try {
      const active = await invoke({ channel: "tweak:active" })
      setActiveTweaks(active || [])
    } catch (err) {
      console.error("Failed to fetch active tweaks:", err)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      invoke({ channel: "get-system-info" }).then((info) => {
        setSystemInfo(info)
      }),
      fetchActiveTweaks(),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const poll = async () => {
      try {
        const stats = (await invoke({ channel: "get-usage-stats" })) as {
          cpu: number
          ram: number
          disk: number
        }
        setCurrentStats(stats)
        setCpuHistory((prev) => [...prev.slice(1), stats.cpu])
        setRamHistory((prev) => [...prev.slice(1), stats.ram])
        setDiskHistory((prev) => [...prev.slice(1), stats.disk])
      } catch (e) {
        console.error("Polling usage failed", e)
      }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const update = () => setUptime(formatUptime())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !systemInfo) {
    return (
      <RootDiv>
        <div className="flex items-center justify-center h-full flex-col gap-5">
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-2 border-sparkle-primary/30 border-t-sparkle-primary rounded-full" />
            <div className="absolute inset-0 bg-sparkle-primary/10 blur-xl rounded-full" />
          </div>
          <p className="text-xs font-mono text-sparkle-text-muted tracking-widest uppercase">
            Initializing Dashboard...
          </p>
        </div>
      </RootDiv>
    )
  }

  return (
    <RootDiv>
      <div className="max-w-[1600px] mx-auto pb-10">
        <Greeting />

        {/* ═══════ REAL-TIME METRICS ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <UsageCard
            title="CPU Load"
            icon={Activity}
            value={currentStats.cpu}
            data={cpuHistory}
            color="#22d3ee"
            subtext={systemInfo?.cpu_model?.split("@")[0]?.trim() || "Processor"}
            delay={40}
          />
          <UsageCard
            title="Memory"
            icon={MemoryStick}
            value={currentStats.ram}
            data={ramHistory}
            color="#a78bfa"
            subtext={`${formatBytes(systemInfo?.memory_total)} Total`}
            delay={80}
          />
          <UsageCard
            title="Disk"
            icon={HardDrive}
            value={currentStats.disk}
            data={diskHistory}
            color="#34d399"
            subtext={systemInfo?.disk_model || "Primary Storage"}
            delay={120}
          />
        </div>

        {/* ═══════ MAIN CONTENT GRID ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: System Specs */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 p-5 backdrop-blur-sm"
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <MonitorCog size={16} className="text-sparkle-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-sparkle-text-secondary">
                  Hardware Specs
                </h3>
              </div>

              <div className="space-y-0">
                <SpecRow
                  icon={MonitorCog}
                  label="Operating System"
                  value={systemInfo?.os_version || "Unknown"}
                  color="text-blue-400"
                />
                <SpecRow
                  icon={Cpu}
                  label="Processor"
                  value={systemInfo?.cpu_model || "Unknown"}
                  color="text-cyan-400"
                />
                <SpecRow
                  icon={Gpu}
                  label="Graphics"
                  value={systemInfo?.gpu_model || "Unknown"}
                  color="text-green-400"
                />
                <SpecRow
                  icon={MemoryStick}
                  label="Memory"
                  value={`${formatBytes(systemInfo?.memory_total)} ${systemInfo?.memory_type || ""}`}
                  color="text-violet-400"
                />
                <SpecRow
                  icon={Activity}
                  label="CPU Cores"
                  value={`${systemInfo?.cpu_cores || "?"} Physical / ${systemInfo?.cpu_threads || "?"} Threads`}
                  color="text-amber-400"
                />
                <SpecRow
                  icon={HardDrive}
                  label="Storage"
                  value={systemInfo?.disk_size || "Unknown"}
                  color="text-emerald-400"
                />
              </div>
            </div>

            {/* Status Card */}
            <div
              className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 p-5 backdrop-blur-sm"
              style={{ animationDelay: "200ms" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-sparkle-secondary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-sparkle-text-secondary">
                  System Status
                </h3>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-semibold text-sparkle-text">
                      All Systems Operational
                    </span>
                  </div>
                  <p className="text-[11px] text-sparkle-text-muted mt-0.5 ml-4">
                    Session uptime: {uptime}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-sparkle-primary">
                    {activeTweaks.length}
                  </div>
                  <div className="text-[10px] text-sparkle-text-muted uppercase tracking-wider">
                    Active Tweaks
                  </div>
                </div>
              </div>

              {activeTweaks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-sparkle-border/20">
                  {activeTweaks.slice(0, 6).map((t, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-md bg-sparkle-secondary/10 border border-sparkle-secondary/15 text-[10px] text-sparkle-secondary font-medium truncate max-w-[110px]"
                    >
                      {t.name || "Tweak"}
                    </span>
                  ))}
                  {activeTweaks.length > 6 && (
                    <span className="px-2 py-1 rounded-md bg-sparkle-border/30 text-[10px] text-sparkle-text-muted font-mono">
                      +{activeTweaks.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Quick Actions & Performance */}
          <div className="lg:col-span-7 space-y-4">
            {/* Performance Banner */}
            <div
              className="animate-fade-slide-up relative overflow-hidden rounded-2xl border border-sparkle-primary/15 bg-gradient-to-r from-sparkle-primary/5 via-sparkle-card/40 to-sparkle-secondary/5 p-5 backdrop-blur-sm"
              style={{ animationDelay: "160ms" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sparkle-primary/3 to-sparkle-secondary/3" />
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-sparkle-primary/5 blur-3xl" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="shrink-0 p-3 rounded-xl bg-sparkle-primary/10 border border-sparkle-primary/20">
                  <Zap size={24} className="text-sparkle-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-sparkle-text">Performance Center</h4>
                  <p className="text-sm text-sparkle-text-secondary mt-0.5">
                    {activeTweaks.length > 0
                      ? `${activeTweaks.length} optimization${activeTweaks.length > 1 ? "s" : ""} currently active`
                      : "No optimizations enabled — configure tweaks to boost performance"}
                  </p>
                </div>
                <Button onClick={() => router("tweaks")} className="shrink-0 gap-2">
                  <Wrench size={14} />
                  Configure
                  <ArrowRight size={14} className="opacity-60" />
                </Button>
              </div>
            </div>

            {/* Quick Navigation Grid */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-sparkle-text-muted" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-sparkle-text-muted/70">
                  Quick Actions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickNavCard
                  icon={Wrench}
                  title="System Tweaks"
                  description="Performance & privacy optimizations"
                  onClick={() => router("tweaks")}
                  color="#22d3ee"
                  delay={240}
                />
                <QuickNavCard
                  icon={Shield}
                  title="Restore Points"
                  description="Manage system backups & snapshots"
                  onClick={() => router("backup")}
                  color="#a78bfa"
                  delay={280}
                />
                <QuickNavCard
                  icon={Activity}
                  title="DNS Manager"
                  description="Configure DNS for faster browsing"
                  onClick={() => router("dns")}
                  color="#34d399"
                  delay={320}
                />
                <QuickNavCard
                  icon={HardDrive}
                  title="System Cleaner"
                  description="Free up disk space & clear caches"
                  onClick={() => router("clean")}
                  color="#f97316"
                  delay={360}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </RootDiv>
  )
}

export default Home
