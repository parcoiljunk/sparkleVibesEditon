import { useState, useEffect, useMemo } from "react"
import Modal from "@/components/ui/modal"
import Button from "@/components/ui/button"
import { toast } from "react-toastify"

interface UpdatePayload {
  version?: string
  message?: string
  percent?: number
}

export default function UpdateManager(): React.ReactElement {
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const isDownloaded = useMemo(() => downloadPercent >= 100, [downloadPercent])

  useEffect(() => {
    const onAvailable = (_e: any, payload: UpdatePayload) => {
      setUpdateVersion(payload?.version ?? null)
      setUpdateOpen(true)
      setIsDownloading(false)
      setDownloadPercent(0)
    }
    const onNotAvailable = () => {
      toast.success("You're up to date")
    }
    const onError = (_e: any, payload: UpdatePayload) => {
      toast.error(payload?.message ?? "Update error")
      setIsDownloading(false)
    }
    const onProgress = (_e: any, payload: UpdatePayload) => {
      setIsDownloading(true)
      setDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0)))
    }
    const onDownloaded = () => {
      setIsDownloading(false)
      setDownloadPercent(100)
    }

    window.electron.ipcRenderer.on("updater:available", onAvailable)
    window.electron.ipcRenderer.on("updater:not-available", onNotAvailable)
    window.electron.ipcRenderer.on("updater:error", onError)
    window.electron.ipcRenderer.on("updater:download-progress", onProgress)
    window.electron.ipcRenderer.on("updater:downloaded", onDownloaded)

    return () => {
      window.electron.ipcRenderer.removeListener("updater:available", onAvailable)
      window.electron.ipcRenderer.removeListener("updater:not-available", onNotAvailable)
      window.electron.ipcRenderer.removeListener("updater:error", onError)
      window.electron.ipcRenderer.removeListener("updater:download-progress", onProgress)
      window.electron.ipcRenderer.removeListener("updater:downloaded", onDownloaded)
    }
  }, [])

  const handleUpdateNow = async () => {
    if (isDownloaded) {
      await window.electron.ipcRenderer.invoke("updater:install")
      return
    }
    setIsDownloading(true)
    setDownloadPercent(0)
    await window.electron.ipcRenderer.invoke("updater:download")
  }

  return (
    <Modal open={updateOpen} onClose={() => {}}>
      <div className="bg-sparkle-card/95 backdrop-blur-xl border border-sparkle-border rounded-2xl p-6 shadow-xl max-w-lg w-full mx-4">
        <div className="w-10 h-10 bg-sparkle-primary/10 rounded-xl flex items-center justify-center mb-4 relative">
          <span className="text-lg relative z-10">&#x2728;</span>
          <div className="absolute inset-0 bg-sparkle-primary/5 blur-lg rounded-full" />
        </div>
        <h2 className="text-lg font-semibold mb-2 text-sparkle-text tracking-tight">
          Update available{updateVersion ? ` (${updateVersion})` : ""}
        </h2>
        <p className="mb-6 text-sparkle-text-secondary text-sm">
          {isDownloaded
            ? "The update has been downloaded. Restart to install now."
            : isDownloading
              ? `Downloading update… ${Math.floor(downloadPercent)}%`
              : "A new version is available. Please update to ensure Sparkle keeps working properly."}
        </p>
        {isDownloading && (
          <div className="w-full h-1.5 bg-sparkle-border rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-sparkle-primary rounded-full transition-all duration-300 shadow-[0_0_8px_-2px] shadow-sparkle-primary/50"
              style={{ width: `${downloadPercent}%` }}
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={handleUpdateNow} disabled={isDownloading}>
            {isDownloaded ? "Restart and install" : isDownloading ? "Downloading…" : "Update now"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
