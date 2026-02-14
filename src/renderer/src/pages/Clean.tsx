import Button from "@/components/ui/button"
import Toggle from "@/components/ui/Toggle"
import { useState } from "react"
import { invoke } from "@/lib/electron"
import RootDiv from "@/components/rootdiv"
import { RefreshCw, Icon } from "lucide-react"
import { broom } from "@lucide/lab"
import { toast } from "react-toastify"
import log from "electron-log/renderer"

const cleanups = [
  {
    id: "temp",
    label: "Clean Temporary Files",
    description: "Remove system and user temporary files.",
    script: `
      $systemTemp = "$env:SystemRoot\\Temp"
      $userTemp = [System.IO.Path]::GetTempPath()
      $foldersToClean = @($systemTemp, $userTemp)
      $totalSizeBefore = 0
      
      foreach ($folder in $foldersToClean) {
          if (Test-Path $folder) {
              $folderSize = (Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
              $totalSizeBefore += if ($folderSize) { $folderSize } else { 0 }
              Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
          }
      }
      
      Write-Output $totalSizeBefore
    `,
  },
  {
    id: "prefetch",
    label: "Clean Prefetch Files",
    description: "Delete files from the Windows Prefetch folder.",
    script: `
      $prefetch = "$env:SystemRoot\\Prefetch"
      $totalSizeBefore = 0
      if (Test-Path $prefetch) {
          $totalSizeBefore = (Get-ChildItem -Path "$prefetch\\*" -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$prefetch\\*" -Force -Recurse -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
  },
  {
    id: "recyclebin",
    label: "Empty Recycle Bin (Dangerous)",
    description: "Permanently remove files from the Recycle Bin.",
    script: `
      $recycleBinSize = 0
      $shell = New-Object -ComObject Shell.Application
      $recycleBin = $shell.Namespace(0xA)
      $recycleBinSize = ($recycleBin.Items() | Measure-Object -Property Size -Sum).Sum
      Clear-RecycleBin -Force -ErrorAction SilentlyContinue
      Write-Output $recycleBinSize
    `,
  },
  {
    id: "windows-update",
    label: "Clean Windows Update Cache",
    description: "Remove Windows Update downloaded installation files.",
    script: `
      $windowsUpdateDownload = "$env:SystemRoot\\SoftwareDistribution\\Download"
      $totalSizeBefore = 0
      if (Test-Path $windowsUpdateDownload) {
          $totalSizeBefore = (Get-ChildItem -Path "$windowsUpdateDownload\\*" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$windowsUpdateDownload\\*" -Force -Recurse -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
  },
  {
    id: "thumbnails",
    label: "Clear Thumbnail Cache",
    description: "Remove cached thumbnail images used by File Explorer.",
    script: `
      $thumbCache = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
      $totalSizeBefore = 0
      $thumbFiles = Get-ChildItem "$thumbCache\\thumbcache_*.db" -ErrorAction SilentlyContinue
      if ($thumbFiles) {
          $totalSizeBefore = ($thumbFiles | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$thumbCache\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
  },
]

function Clean() {
  const [selected, setSelected] = useState<string[]>([])
  const [loadingQueue, setLoadingQueue] = useState<string[]>([])
  const [lastClean, setLastClean] = useState(
    localStorage.getItem("last-clean") || "Not cleaned yet.",
  )
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResults, setCleanupResults] = useState({})

  const toggleCleanup = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 B"
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  async function runSelectedCleanups() {
    setIsCleaning(true)
    setLoadingQueue([])
    setCleanupResults({})
    let anySuccess = false
    let newResults = {}

    for (const cleanup of cleanups) {
      if (!selected.includes(cleanup.id)) continue
      setLoadingQueue((q) => [...q, cleanup.id])
      const toastId = toast.loading(`Running ${cleanup.label}...`)
      try {
        const result = await invoke({
          channel: "run-powershell",
          payload: { script: cleanup.script, name: `cleanup-${cleanup.id}` },
        })

        const resultStr = result?.output || "0"
        const freedSpace = parseInt(resultStr.trim(), 10) || 0
        newResults[cleanup.id] = freedSpace

        toast.update(toastId, {
          render: `${cleanup.label} completed! ${formatBytes(freedSpace)} cleared.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        anySuccess = true
      } catch (err: any) {
        toast.update(toastId, {
          render: `Failed: ${err.message || err}`,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        })
        log.error(`Failed to run ${cleanup.id} cleanup: ${err.message || err}`)
      }
    }

    if (anySuccess) {
      const now = new Date().toLocaleString()
      setLastClean(now)
      localStorage.setItem("last-clean", now)
      setCleanupResults(newResults)
    }

    setLoadingQueue([])
    setIsCleaning(false)
  }

  const totalFreed = Object.values(cleanupResults).reduce(
    (sum: number, v: any) => sum + (parseInt(v) || 0),
    0,
  )

  const cleanIcons: Record<string, string> = {
    temp: "🗑️",
    prefetch: "⚡",
    recyclebin: "♻️",
    "windows-update": "🔄",
    thumbnails: "🖼️",
  }

  return (
    <RootDiv>
      <div className="max-w-[1600px] mx-auto pb-10">
        {/* Header */}
        <div className="mb-6 animate-fade-slide-up">
          <h1 className="text-2xl font-bold text-sparkle-text tracking-tight">System Cleanup</h1>
          <p className="text-sm text-sparkle-text-secondary mt-1">
            Remove temporary files and free up disk space
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div
            className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-4"
            style={{ animationDelay: "40ms" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-sparkle-text-muted/70 mb-1">
              Selected
            </div>
            <div className="text-2xl font-bold text-sparkle-text">
              {selected.length}
              <span className="text-sm font-normal text-sparkle-text-muted ml-1">
                / {cleanups.length}
              </span>
            </div>
          </div>
          <div
            className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-4"
            style={{ animationDelay: "80ms" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-sparkle-text-muted/70 mb-1">
              Space Freed
            </div>
            <div className="text-2xl font-bold text-teal-400">{formatBytes(totalFreed)}</div>
          </div>
          <div
            className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-4"
            style={{ animationDelay: "120ms" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-sparkle-text-muted/70 mb-1">
              Last Cleaned
            </div>
            <div className="text-sm font-medium text-sparkle-text truncate mt-1">{lastClean}</div>
          </div>
        </div>

        {/* Cleanup Items */}
        <div className="space-y-3 mb-6">
          {cleanups.map(({ id, label, description }, idx) => {
            const isSelected = selected.includes(id)
            const isInQueue = loadingQueue.includes(id)
            const freed = cleanupResults[id]

            return (
              <div
                key={id}
                className={`animate-fade-slide-up group relative overflow-hidden rounded-2xl border backdrop-blur-sm p-4 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10"
                    : "border-sparkle-border/30 bg-sparkle-card/30 hover:bg-sparkle-card/50"
                } ${isInQueue ? "ring-1 ring-teal-500/40" : ""}`}
                style={{ animationDelay: `${160 + idx * 40}ms` }}
                onClick={() => !isCleaning && toggleCleanup(id)}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
                )}

                <div className="flex items-center gap-4">
                  <div
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
                      isSelected
                        ? "bg-teal-500/15 scale-110"
                        : "bg-sparkle-accent/50 grayscale opacity-60"
                    }`}
                  >
                    {cleanIcons[id] || "📁"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-sparkle-text">{label}</span>
                      {freed !== undefined && (
                        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-full">
                          {formatBytes(freed)} freed
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-sparkle-text-muted">{description}</span>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {isInQueue && <RefreshCw className="animate-spin text-teal-400 w-4 h-4" />}
                    <Toggle
                      checked={isSelected}
                      onChange={() => toggleCleanup(id)}
                      disabled={isCleaning}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Bar */}
        <div
          className="animate-fade-slide-up flex items-center justify-between rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-4"
          style={{ animationDelay: "360ms" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setSelected(selected.length === cleanups.length ? [] : cleanups.map((c) => c.id))
              }
              disabled={isCleaning}
              className="text-xs text-sparkle-text-secondary hover:text-sparkle-primary transition-colors disabled:opacity-50"
            >
              {selected.length === cleanups.length ? "Deselect All" : "Select All"}
            </button>
            {selected.includes("recyclebin") && (
              <span className="text-[10px] text-amber-400 font-medium">
                ⚠ Recycle Bin contents will be permanently deleted
              </span>
            )}
          </div>

          <Button
            onClick={runSelectedCleanups}
            disabled={isCleaning || selected.length === 0}
            variant="primary"
            className="min-w-[160px] flex items-center justify-center gap-2"
          >
            {isCleaning ? (
              <>
                <RefreshCw className="animate-spin w-4 h-4" />
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Icon iconNode={broom} size={16} />
                <span>Clean {selected.length > 0 ? `(${selected.length})` : "Selected"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </RootDiv>
  )
}

export default Clean
