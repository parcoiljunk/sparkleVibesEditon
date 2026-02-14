import { useEffect, useState, useMemo } from "react"
import {
  RefreshCw,
  Plus,
  Shield,
  RotateCcw,
  Loader2,
  Search,
  HardDrive,
  Clock,
  Trash2,
  AlertTriangle,
  Save,
  Activity,
  Archive,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import RootDiv from "@/components/rootdiv"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { cn } from "@/lib/utils"

// --- Aesthetic Helper Components ---
const SectionLabel = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div className={cn("flex items-center gap-2 mb-3", className)}>
    <div className="h-px w-4 bg-sparkle-border"></div>
    <span className="text-xs font-bold uppercase tracking-widest text-sparkle-text-muted/70">
      {children}
    </span>
    <div className="h-px flex-1 bg-sparkle-border"></div>
  </div>
)

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext = null,
  status = "neutral",
  loading = false,
}) => {
  const statusColors = {
    neutral: "text-sparkle-primary",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-sparkle-border/40 bg-sparkle-card/30 p-4 backdrop-blur-sm transition-all hover:bg-sparkle-card/50 hover:border-sparkle-primary/20 group">
      <div
        className={cn(
          "absolute -right-4 -top-4 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12",
          statusColors[status as keyof typeof statusColors],
        )}
      >
        <Icon size={80} strokeWidth={1} />
      </div>
      <div className="relative z-10">
        <div className="mb-1 flex items-center gap-2 text-sparkle-text-muted">
          <Icon size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-bold text-sparkle-text">
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-sparkle-border/30" />
          ) : (
            value
          )}
        </div>
        {subtext && !loading && (
          <p
            className={cn(
              "text-[10px] font-mono mt-1",
              status === "success"
                ? "text-green-400/70"
                : status === "danger"
                  ? "text-red-400/70"
                  : "text-sparkle-text-muted",
            )}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}

export default function RestorePointManager() {
  const [restorePoints, setRestorePoints] = useState<RestorePointList>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "system" | "manual">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: string | null
    restorePoint: any | null
  }>({
    isOpen: false,
    type: null,
    restorePoint: null,
  })

  // Types
  type RestorePoint = {
    SequenceNumber: number
    Description: string
    CreationTime: string
    EventType: number
    RestorePointType: number
  }
  type RestorePointList = RestorePoint[]

  // Custom Modal State
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [customName, setCustomName] = useState("")

  // --- Logic ---
  const fetchRestorePoints = async () => {
    setLoading(true)
    try {
      const response = await invoke({ channel: "get-restore-points" })
      if (response.success && Array.isArray(response.points)) {
        const sorted = response.points.sort((a, b) => {
          const parse = (str: string) => {
            // Defense against malformed dates
            if (!str || str.length < 14) return 0
            return new Date(
              `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}`,
            ).getTime()
          }
          return parse(b.CreationTime) - parse(a.CreationTime)
        })
        setRestorePoints(sorted)
      } else {
        toast.error("Failed to load restore points.")
        log.error("Failed to load restore points:", response)
      }
    } catch (error) {
      toast.error(`Failed to load restore points.`)
      console.error(error)
      log.error("Failed to load restore points:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRestorePoints()
  }, [])

  const handleCreateRestorePoint = async () => {
    setProcessing(true)
    try {
      await invoke({ channel: "create-sparkle-restore-point" })
      toast.success("Restore point created!")
      await fetchRestorePoints()
    } catch (err) {
      toast.error("Failed to create restore point.")
      log.error("Failed to create restore point:", err)
    }
    setProcessing(false)
  }

  const handleRestore = (restorePoint) => {
    setModalState({ isOpen: true, type: "restore", restorePoint })
  }

  const executeRestore = async () => {
    setProcessing(true)
    try {
      await invoke({
        channel: "restore-restore-point",
        payload: modalState.restorePoint.SequenceNumber,
      })
      toast.success("System restore started. Your PC may restart.")
    } catch (err) {
      toast.error("Failed to start system restore.")
      log.error("Failed to start system restore:", err)
    }
    setProcessing(false)
    setModalState({ isOpen: false, type: null, restorePoint: null })
  }

  const handleCustomRestorePoint = async () => {
    setProcessing(true)
    try {
      if (!customName.trim()) {
        toast.error("Please enter a name for the restore point.")
        setProcessing(false)
        return
      }
      await invoke({ channel: "create-restore-point", payload: customName })
      toast.success("Restore point created!")
      setCustomModalOpen(false)
      setCustomName("")
      await fetchRestorePoints()
    } catch (err) {
      toast.error("Failed to create restore point.")
      log.error("Failed to create restore point:", err)
    }
    setProcessing(false)
  }

  const handleDeleteAll = async () => {
    setProcessing(true)
    await invoke({ channel: "delete-all-restore-points" })
    toast.success("All restore points deleted successfully.")
    setProcessing(false)
    await fetchRestorePoints()
  }

  // Formatting dates for visuals
  const formatDate = (str: string) => {
    try {
      if (!str || str.length < 14) return "Unknown Date"
      const date = new Date(
        `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}`,
      )
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(date)
    } catch (e) {
      return str
    }
  }

  const parseDate = (str: string) => {
    if (!str || str.length < 14) return new Date(0)
    return new Date(
      `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}`,
    )
  }

  const filteredRestorePoints = useMemo(
    () =>
      restorePoints.filter((rp: RestorePoint) => {
        const matchesSearch = (rp.Description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        if (filterType === "all") return true
        if (filterType === "system") return rp.RestorePointType === 0 // 0 usually maps to system
        if (filterType === "manual") return rp.RestorePointType !== 0 // Simplified logic
        return true
      }),
    [restorePoints, searchQuery, filterType],
  )

  // System Health Calculation
  const healthStatus = useMemo(() => {
    if (restorePoints.length === 0) return { status: "danger", text: "No Protection" }
    const lastBackup = restorePoints[0]
    if (!lastBackup) return { status: "danger", text: "Unknown" }

    const date = parseDate(lastBackup.CreationTime)
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 3) return { status: "success", text: "Secure" }
    if (diffDays <= 7) return { status: "warning", text: "Fair" }
    return { status: "danger", text: "Outdated" }
  }, [restorePoints])

  // --- Render ---

  return (
    <>
      <RootDiv>
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-2 py-4">
          {/* Header Stats Area */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2 flex flex-col justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-sparkle-text to-sparkle-text/60">
                  SYSTEM <span className="text-sparkle-primary">BACKUP</span>
                </h1>
                <p className="mt-2 text-sm text-sparkle-text-secondary">
                  Manage snapshots and recovery points.
                </p>
              </div>

              <div className="relative mt-auto group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sparkle-text-muted transition-colors group-focus-within:text-sparkle-primary"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="SEARCH SNAPSHOTS_//..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-sparkle-border/50 bg-sparkle-card/50 py-3 pl-10 pr-4 text-sm font-medium text-sparkle-text shadow-xs backdrop-blur-md transition-all focus:border-sparkle-primary/50 focus:bg-sparkle-card focus:shadow-[0_0_20px_-5px_rgba(var(--sparkle-primary-rgb),0.2)] focus:outline-hidden focus:ring-1 focus:ring-sparkle-primary/50 placeholder:text-sparkle-text-muted/50 font-mono tracking-wide"
                />
              </div>
            </div>

            <StatCard
              icon={Archive}
              label="Total Snapshots"
              value={restorePoints.length}
              loading={loading}
              status="neutral"
            />

            <StatCard
              icon={
                healthStatus.status === "success"
                  ? CheckCircle2
                  : healthStatus.status === "warning"
                    ? AlertCircle
                    : Activity
              }
              label="Protection Status"
              value={healthStatus.text}
              subtext={
                restorePoints.length > 0
                  ? `Last: ${formatDate(restorePoints[0].CreationTime)}`
                  : "No backups found"
              }
              status={healthStatus.status}
              loading={loading}
            />
          </div>

          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            {/* Sidebar / Actions Panel */}
            <div className="flex shrink-0 flex-col gap-4 lg:w-64">
              <SectionLabel>Control Deck</SectionLabel>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="primary"
                  onClick={handleCreateRestorePoint}
                  className="h-14 w-full justify-between px-4 text-left group"
                  disabled={loading || processing}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                      New Snapshot
                    </span>
                    <span className="text-[10px] opacity-60">Quick Auto-Label</span>
                  </div>
                  {processing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus
                      size={20}
                      className="transition-transform duration-300 group-hover:rotate-90"
                    />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setCustomModalOpen(true)}
                  disabled={loading || processing}
                  className="h-12 w-full justify-start gap-3 px-4"
                >
                  <Save size={16} className="text-sparkle-primary" />
                  <span className="text-xs font-semibold">Custom Snapshot</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={fetchRestorePoints}
                  className="h-12 w-full justify-start gap-3 px-4"
                  disabled={loading || processing}
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin text-sparkle-primary" : ""}
                  />
                  <span className="text-xs font-semibold">Refresh List</span>
                </Button>
              </div>

              <div className="mt-4">
                <SectionLabel>Filters</SectionLabel>
                <div className="flex flex-col gap-1">
                  {[
                    { id: "all", label: "All Events", icon: LayoutGrid },
                    { id: "system", label: "System Auto", icon: HardDrive },
                    { id: "manual", label: "Manual User", icon: Save },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id as any)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        filterType === f.id
                          ? "bg-sparkle-primary/15 text-sparkle-primary border border-sparkle-primary/20"
                          : "text-sparkle-text-muted hover:bg-sparkle-card hover:text-sparkle-text",
                      )}
                    >
                      <f.icon size={14} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4">
                <SectionLabel>Danger Zone</SectionLabel>
                <Button
                  variant="danger"
                  onClick={handleDeleteAll}
                  disabled={loading || processing}
                  className="w-full justify-start gap-3 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-semibold">Purge All</span>
                </Button>
              </div>
            </div>

            {/* Main List Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel className="mb-0">Timeline</SectionLabel>
                <div className="flex gap-1 bg-sparkle-card/50 p-1 rounded-lg border border-sparkle-border/50">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "grid"
                        ? "bg-sparkle-primary/20 text-sparkle-primary"
                        : "text-sparkle-text-muted hover:text-sparkle-text",
                    )}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "list"
                        ? "bg-sparkle-primary/20 text-sparkle-primary"
                        : "text-sparkle-text-muted hover:text-sparkle-text",
                    )}
                  >
                    <ListIcon size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 rounded-xl custom-scrollbar">
                {loading ? (
                  <div className="flex h-64 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-sparkle-border/50 bg-sparkle-card/20 text-sparkle-text-muted">
                    <Loader2 size={32} className="animate-spin text-sparkle-primary" />
                    <p className="text-xs uppercase tracking-widest font-mono">
                      Loading Registry...
                    </p>
                  </div>
                ) : filteredRestorePoints.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-sparkle-border/40 bg-sparkle-card/10 p-12 text-center text-sparkle-text-secondary transition-all hover:bg-sparkle-card/20">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sparkle-secondary/50 shadow-[0_0_30px_-5px_rgba(var(--sparkle-primary-rgb),0.1)]">
                      <Shield size={32} className="text-sparkle-primary/80" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-sparkle-text">
                      Everything looks new!
                    </h3>
                    <p className="mb-6 max-w-xs text-sm leading-relaxed text-sparkle-text-muted">
                      {searchQuery
                        ? "No snapshots match your specific search criteria."
                        : "Create your first restore point to ensure your system is safe before tweaks."}
                    </p>
                    {!searchQuery && (
                      <Button onClick={handleCreateRestorePoint} disabled={processing}>
                        Initialize First Backup
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-3",
                      viewMode === "grid" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {filteredRestorePoints.map((rp, index) => (
                      <div
                        key={index}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border border-sparkle-border/40 bg-sparkle-card/40 backdrop-blur-xs transition-all duration-300 hover:border-sparkle-primary/30 hover:bg-sparkle-card/60 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]",
                          viewMode === "grid"
                            ? "flex flex-col justify-between p-5 hover:-translate-y-1"
                            : "flex items-center gap-4 p-3 hover:translate-x-1",
                        )}
                      >
                        {viewMode === "grid" && (
                          <div className="absolute right-3 top-3 font-mono text-5xl font-bold text-sparkle-text/5 select-none pointer-events-none group-hover:text-sparkle-primary/5 transition-colors">
                            {(index + 1).toString().padStart(2, "0")}
                          </div>
                        )}

                        <div
                          className={cn(
                            "relative z-10",
                            viewMode === "list" && "flex-1 flex items-center justify-between gap-4",
                          )}
                        >
                          {viewMode === "grid" ? (
                            // GRID CONTENT
                            <div className="mb-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-sparkle-border bg-sparkle-accent/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sparkle-text-secondary/80">
                                  <HardDrive size={10} />
                                  ID: {rp.SequenceNumber}
                                </span>
                                <span className="font-mono text-xs text-sparkle-text-muted flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatDate(rp.CreationTime)}
                                </span>
                              </div>
                              <h4 className="line-clamp-2 text-base font-bold leading-tight text-sparkle-text group-hover:text-sparkle-primary transition-colors">
                                {rp.Description}
                              </h4>
                              <div className="mt-2 flex items-center gap-2 text-[10px] text-sparkle-text-muted/60 font-mono">
                                <span>TYPE: {rp.RestorePointType ?? "SYS"}</span>
                                <span>•</span>
                                <span>EVENT: {rp.EventType ?? 0}</span>
                              </div>
                            </div>
                          ) : (
                            // LIST CONTENT
                            <>
                              <div className="flex items-center gap-4 flex-1">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-sparkle-secondary/10 flex items-center justify-center text-sparkle-secondary">
                                  <Shield size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="text-sm font-bold text-sparkle-text truncate">
                                      {rp.Description}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sparkle-border/50 px-1.5 py-0.5 text-[9px] font-mono text-sparkle-text-muted">
                                      ID: {rp.SequenceNumber}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-sparkle-text-muted">
                                    <span className="flex items-center gap-1">
                                      <Clock size={10} /> {formatDate(rp.CreationTime)}
                                    </span>
                                    <span>TYPE: {rp.RestorePointType}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div
                          className={cn(
                            "relative z-10 flex justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100",
                            viewMode === "grid"
                              ? "mt-auto pt-4 border-t border-sparkle-border/20"
                              : "",
                          )}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "text-xs",
                              viewMode === "grid" ? "h-8 w-full justify-center" : "h-8 px-3",
                            )}
                            onClick={() => handleRestore(rp)}
                            disabled={processing}
                          >
                            <RotateCcw size={12} className="mr-2" />
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </RootDiv>

      {/* --- Modals with updated styling --- */}

      <Modal
        open={modalState.isOpen}
        onClose={() =>
          !processing && setModalState({ isOpen: false, type: null, restorePoint: null })
        }
      >
        {modalState.type === "restore" && modalState.restorePoint && (
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-sparkle-border bg-sparkle-card p-0 shadow-2xl backdrop-blur-xl">
            <div className="relative bg-red-500/10 p-6 flex items-center justify-center border-b border-red-500/20">
              <AlertTriangle size={48} className="text-red-400" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            <div className="p-6">
              <h3 className="mb-2 text-xl font-bold text-sparkle-text text-center">
                System Restore Initiated
              </h3>

              <div className="mb-6 rounded-lg bg-sparkle-secondary/30 p-4 border border-sparkle-border/50 text-center">
                <p className="text-xs uppercase tracking-widest text-sparkle-text-muted mb-1">
                  Target Snapshot
                </p>
                <p className="font-bold text-sparkle-primary text-lg">
                  "{modalState.restorePoint.Description}"
                </p>
              </div>

              <p className="mb-6 text-center text-sm leading-relaxed text-sparkle-text-secondary">
                You are about to revert your system configuration. Your PC will restart shortly.
                <br className="mb-2 block" />
                <span className="font-semibold text-red-400">Personal files are safe</span>, but
                apps installed after this point may be removed.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() =>
                    !processing && setModalState({ isOpen: false, type: null, restorePoint: null })
                  }
                  disabled={processing}
                >
                  cancel
                </Button>
                <Button
                  variant="primary"
                  className="w-full justify-center bg-red-500/80 hover:bg-red-500 hover:shadow-red-500/30 border-red-400/30 text-white"
                  onClick={executeRestore}
                  disabled={processing}
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : "CONFIRM RESTORE"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={customModalOpen} onClose={() => !processing && setCustomModalOpen(false)}>
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-sparkle-border bg-sparkle-card shadow-2xl">
          <div className="border-b border-sparkle-border/50 bg-sparkle-background/50 p-4 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-sparkle-text flex items-center gap-2">
              <Save size={18} className="text-sparkle-primary" />
              Create Restore Point
            </h3>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-sparkle-text-muted ml-1 mb-1.5 block">
                Snapshot Name
              </label>
              <input
                type="text"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Before Driver Update..."
                className="w-full rounded-lg border border-sparkle-border bg-sparkle-background/50 p-3 text-sm text-sparkle-text placeholder-sparkle-text-muted/50 outline-hidden focus:border-sparkle-primary focus:ring-1 focus:ring-sparkle-primary transition-all shadow-inner"
                disabled={processing}
                onKeyDown={(e) =>
                  e.key === "Enter" && customName.trim() && handleCustomRestorePoint()
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => !processing && setCustomModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCustomRestorePoint}
                disabled={processing || !customName.trim()}
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : "Create Snapshot"}
              </Button>
            </div>
          </div>
          <div className="bg-sparkle-secondary/30 p-3 text-center">
            <p className="text-[10px] text-sparkle-text-muted">
              Optimization Tip: This process usually takes 20-60 seconds depending on your disk
              speed.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}
