import { useState, useMemo, Suspense } from "react"
import data from "../assets/apps.json"
import RootDiv from "@/components/rootdiv"
import { Search } from "lucide-react"
import Button from "@/components/ui/button"
import Checkbox from "@/components/ui/Checkbox"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import { Download } from "lucide-react"
import { Trash } from "lucide-react"
import { ExternalLink } from "lucide-react"
import { toast } from "react-toastify"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import log from "electron-log/renderer"
import { Upload } from "lucide-react"
import { LargeInput } from "@/components/ui/input"
import { Dropdown } from "@/components/ui/dropdown"

interface AppData {
  name: string
  id: string | string[]
  chocolatey?: string
  category: string
  info: string
  link?: string
  icon: string
  warning?: string
}

interface AppsByCategory {
  [key: string]: AppData[]
}

interface InvokeResult {
  success: boolean
  installed?: boolean
  error?: string
}

function Apps() {
  const [search, setSearch] = useState("")
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [loading, setLoading] = useState("")
  const [currentApp, setCurrentApp] = useState("")
  const [totalApps, setTotalApps] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedApps, setImportedApps] = useState<string[]>([])
  const [selectedImportedApps, setSelectedImportedApps] = useState<string[]>([])
  const [appsList, setAppsList] = useState<AppData[]>([])
  const [wingetInstalled, setWingetInstalled] = useState<boolean>(true)
  const [wingetChecking, setWingetChecking] = useState<boolean>(false)
  const [wingetInstalling, setWingetInstalling] = useState<boolean>(false)
  const [source, setSource] = useState<"Chocolatey" | "Winget">(
    (localStorage.getItem("defaultPackageManager") as "Chocolatey" | "Winget") || "Winget",
  )

  const [chocolateyInstalled, setChocolateyInstalled] = useState<boolean>(true)
  const [chocolateyChecking, setChocolateyChecking] = useState<boolean>(false)
  const [chocolateyInstalling, setChocolateyInstalling] = useState<boolean>(false)

  const router = useNavigate()

  const filteredApps = appsList
    .filter((app: AppData) => app.name.toLowerCase().includes(search.toLowerCase()))
    .filter((app: AppData) => {
      if (source === "Chocolatey") {
        return (app as any).chocolatey !== undefined
      }
      return true
    })

  // Helper function to get the app ID based on current source
  const getAppIdForSource = (app: AppData): string => {
    if (source === "Chocolatey" && app.chocolatey) {
      return app.chocolatey
    }
    return Array.isArray(app.id) ? app.id[0] : app.id
  }

  const exportSelectedApps = () => {
    const blob = new Blob([JSON.stringify(selectedApps, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sparkle-apps.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSelectedApps = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) throw new Error("File read error")
        const parsed = JSON.parse(e.target.result as string)
        if (Array.isArray(parsed)) {
          setImportedApps(parsed)
          setSelectedImportedApps(parsed)
          setImportModalOpen(true)
        } else {
          toast.error("Invalid import file format")
        }
      } catch {
        toast.error("Failed to parse JSON file")
      } finally {
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }

  const appsByCategory = useMemo(() => {
    return filteredApps.reduce<AppsByCategory>((acc, app) => {
      if (!acc[app.category]) acc[app.category] = []
      acc[app.category].push(app)
      return acc
    }, {})
  }, [filteredApps])

  const checkWinget = async (): Promise<void> => {
    setWingetChecking(true)
    try {
      const result = (await invoke({ channel: "check-winget" })) as InvokeResult
      if (result.success) {
        setWingetInstalled(result.installed ?? false)
      } else {
        console.warn("Failed to check Winget status:", result.error)
        setWingetInstalled(false)
      }
    } catch (error) {
      console.error("Error checking Winget:", error)
      setWingetInstalled(false)
    } finally {
      setWingetChecking(false)
    }
  }

  const installWinget = async (): Promise<void> => {
    setWingetInstalling(true)
    try {
      await invoke({ channel: "install-winget" })
      toast.success("Winget installation completed!")
      await checkWinget()
    } catch (error) {
      console.error("Error installing Winget:", error)
      toast.error("Failed to install Winget. Please try again.")
    } finally {
      setWingetInstalling(false)
    }
  }

  const checkChocolatey = async (): Promise<void> => {
    setChocolateyChecking(true)
    try {
      const result = (await invoke({ channel: "check-chocolatey" })) as InvokeResult
      if (result.success) {
        setChocolateyInstalled(result.installed ?? false)
      } else {
        console.warn("Failed to check Chocolatey status:", result.error)
        setChocolateyInstalled(false)
      }
    } catch (error) {
      console.error("Error checking Chocolatey:", error)
      setChocolateyInstalled(false)
    } finally {
      setChocolateyChecking(false)
    }
  }

  const installChocolatey = async (): Promise<void> => {
    setChocolateyInstalling(true)
    try {
      await invoke({ channel: "install-chocolatey" })
      toast.success("Chocolatey installation completed!")
      await checkChocolatey()
    } catch (error) {
      console.error("Error installing Chocolatey:", error)
      toast.error("Failed to install Chocolatey. Please try again.")
    } finally {
      setChocolateyInstalling(false)
    }
  }

  const toggleApp = (appId: string): void => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((selectedId) => selectedId !== appId) : [...prev, appId],
    )
  }

  useEffect(() => {
    const loadApps = async () => {
      try {
        let appsData: { apps: AppData[] }
        if (import.meta.env.DEV) {
          appsData = data as { apps: AppData[] }
        } else {
          const response = await fetch(
            "https://raw.githubusercontent.com/parcoil/sparkle/refs/heads/v2/src/renderer/src/assets/apps.json",
          )
          appsData = await response.json()
        }
        setAppsList(appsData.apps || [])
      } catch (error) {
        console.error("Failed to load apps list", error)
        toast.error("Failed to fetch apps list (Using local apps.json)")
        setAppsList((data as { apps: AppData[] }).apps || [])
      }
    }

    loadApps()
    checkWinget()
    checkChocolatey()

    const listeners = {
      "install-progress": (_event: unknown, message: string) => {
        console.log(message)
        setCurrentApp(message)
        setCurrentIndex((prev) => prev + 1)
      },
      "install-complete": () => {
        setLoading("")
        setCurrentApp("")
        setCurrentIndex(0)
        setTotalApps(0)
        toast.success("Operation completed successfully!")
      },
      "install-error": () => {
        setLoading("")
        setCurrentApp("")
        toast.error("There was an error during the operation. Please try again.")
      },
    }

    Object.entries(listeners).forEach(([channel, listener]) => {
      window.electron.ipcRenderer.on(channel, listener)
    })

    return () => {
      Object.keys(listeners).forEach((channel) => {
        window.electron.ipcRenderer.removeAllListeners(channel)
      })
    }
  }, [])

  useEffect(() => {
    setSelectedApps([]) // reset selections when switching sources
    if (source === "Chocolatey") {
      checkChocolatey()
    }
  }, [source])

  const handleAppAction = async (type: string, appsToUse = selectedApps) => {
    const actionVerb = type === "install" ? "Installing" : "Uninstalling"
    setLoading(type)

    try {
      if (appsToUse.length === 0) return

      invoke({
        channel: "handle-apps",
        payload: {
          action: type,
          apps: appsToUse,
          source: source,
        },
      })

      setTotalApps(appsToUse.length)
      setCurrentIndex(0)
    } catch (error) {
      console.error(`Error ${actionVerb.toLowerCase()} apps:`, error)
      log.error(`Error ${actionVerb.toLowerCase()} apps:`, error)
    }
  }

  return (
    <>
      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)}>
        <div className="bg-sparkle-card/95 backdrop-blur-xl border border-sparkle-border/50 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-4">
          <h3 className="text-lg font-semibold text-sparkle-text mb-1 tracking-tight">
            Import Apps
          </h3>
          <p className="text-xs text-sparkle-text-muted mb-4">
            {importedApps.length} app{importedApps.length !== 1 ? "s" : ""} found in file
          </p>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 mb-5">
            {importedApps.length > 0 ? (
              importedApps.map((id) => {
                const app = appsList.find((a) => a.id === id)
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sparkle-accent/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedImportedApps.includes(id)}
                      onChange={(checked: boolean) => {
                        setSelectedImportedApps((prev) =>
                          checked
                            ? prev.includes(id)
                              ? prev
                              : [...prev, id]
                            : prev.filter((x) => x !== id),
                        )
                      }}
                    />
                    <span className="text-sm text-sparkle-text">
                      {app ? app.name : `Unknown (${id})`}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-sparkle-text-muted text-sm italic text-center py-4">
                No apps found
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedImportedApps.length === 0}
              onClick={() => {
                setSelectedApps(selectedImportedApps)
                setImportModalOpen(false)
                handleAppAction("install", selectedImportedApps)
              }}
            >
              Install ({selectedImportedApps.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal open={!!loading} onClose={() => {}}>
        <div className="bg-sparkle-card/95 backdrop-blur-xl border border-sparkle-border/50 rounded-2xl p-6 shadow-2xl min-w-[320px]">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 border-3 rounded-full animate-spin border-t-sparkle-primary border-sparkle-accent/30" />
              {loading === "install" ? (
                <Download className="w-5 h-5 text-sparkle-primary" />
              ) : (
                <Trash className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-sparkle-text">
                {loading === "install" ? "Installing" : "Uninstalling"}
              </h3>
              <p className="text-sm text-sparkle-text-secondary truncate max-w-[200px]">
                {currentApp || "Preparing..."}
              </p>
              {totalApps > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-sparkle-text-muted mb-1">
                    <span>Progress</span>
                    <span>
                      {currentIndex} / {totalApps}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-sparkle-accent/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sparkle-primary rounded-full transition-all duration-500"
                      style={{ width: `${(currentIndex / totalApps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <RootDiv>
        <div className="max-w-[1600px] mx-auto pb-10">
          {/* Header */}
          <div className="mb-5 animate-fade-slide-up">
            <h1 className="text-2xl font-bold text-sparkle-text tracking-tight">App Manager</h1>
            <p className="text-sm text-sparkle-text-secondary mt-1">
              Install, uninstall, and manage applications via {source}
            </p>
          </div>

          {/* Search */}
          <div className="animate-fade-slide-up" style={{ animationDelay: "40ms" }}>
            <LargeInput
              icon={Search}
              placeholder={`Search ${filteredApps.length} apps...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Winget Warning */}
          {!wingetInstalled && (
            <div className="animate-fade-slide-up mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Download className="text-amber-400 w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-sparkle-text">Winget Not Installed</h3>
                <p className="text-xs text-sparkle-text-muted">
                  Required to install and manage applications
                </p>
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-amber-500/20 hover:bg-amber-500/10"
                onClick={installWinget}
                disabled={wingetInstalling || wingetChecking}
              >
                {wingetInstalling ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Installing...
                  </>
                ) : wingetChecking ? (
                  "Checking..."
                ) : (
                  <>
                    <Download size={16} /> Install
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Chocolatey Warning */}
          {source === "Chocolatey" && !chocolateyInstalled && (
            <div className="animate-fade-slide-up mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Download className="text-amber-400 w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-sparkle-text">
                  Chocolatey Not Installed
                </h3>
                <p className="text-xs text-sparkle-text-muted">
                  Required for Chocolatey package source
                </p>
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-amber-500/20 hover:bg-amber-500/10"
                onClick={installChocolatey}
                disabled={chocolateyInstalling || chocolateyChecking}
              >
                {chocolateyInstalling ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Installing...
                  </>
                ) : chocolateyChecking ? (
                  "Checking..."
                ) : (
                  <>
                    <Download size={16} /> Install
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Action Bar */}
          <div
            className="animate-fade-slide-up mt-4 rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-3 flex items-center gap-2 flex-wrap"
            style={{ animationDelay: "80ms" }}
          >
            <Button
              disabled={selectedApps.length === 0 || loading !== ""}
              onClick={() => handleAppAction("install")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install{selectedApps.length > 0 ? ` (${selectedApps.length})` : ""}
            </Button>
            <Button
              variant="danger"
              disabled={selectedApps.length === 0 || loading !== ""}
              onClick={() => handleAppAction("uninstall")}
              className="flex items-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Uninstall
            </Button>
            <Button
              variant="secondary"
              onClick={exportSelectedApps}
              disabled={selectedApps.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg font-medium px-3 py-1.5 text-sm bg-sparkle-accent/50 border border-sparkle-border/30 text-sparkle-text hover:bg-sparkle-accent/80 active:scale-95 transition-all duration-200">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={importSelectedApps}
              />
            </label>

            <div className="flex items-center gap-2 ml-auto">
              {selectedApps.length > 0 && (
                <button
                  className="text-xs text-sparkle-text-secondary hover:text-sparkle-primary transition-colors"
                  onClick={() => setSelectedApps([])}
                >
                  Clear All
                </button>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-sparkle-border/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sparkle-text-muted/70">
                  Source
                </span>
                <Dropdown
                  options={["Winget", "Chocolatey"]}
                  value={source || "Winget"}
                  onChange={(value) => setSource(value as "Chocolatey" | "Winget")}
                />
              </div>
            </div>
          </div>

          {/* Dev & Tip */}
          <div className="flex items-center gap-2 mt-3 mb-4 px-1">
            {import.meta.env.DEV && (
              <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                DEV MODE
              </span>
            )}
            <p className="text-xs text-sparkle-text-muted">
              Looking to debloat?{" "}
              <a
                className="text-sparkle-primary hover:underline cursor-pointer"
                onClick={() => router("/tweaks")}
              >
                Check Tweaks
              </a>
            </p>
          </div>

          {/* App Grid */}
          <div className="space-y-8 mb-10">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-sparkle-primary/30 border-t-sparkle-primary rounded-full" />
                </div>
              }
            >
              {Object.entries(appsByCategory).map(([category, apps], catIdx) => (
                <div
                  key={category}
                  className="animate-fade-slide-up"
                  style={{ animationDelay: `${120 + catIdx * 60}ms` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-sparkle-primary/80 capitalize">
                      {category}
                    </h2>
                    <span className="text-[10px] text-sparkle-text-muted bg-sparkle-accent/50 px-1.5 py-0.5 rounded-full">
                      {apps.length}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-sparkle-border/30 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {apps.map((app) => {
                      const appId = getAppIdForSource(app)
                      const isSelected = selectedApps.includes(appId)
                      return (
                        <button
                          key={appId}
                          onClick={() => toggleApp(appId)}
                          className={`group relative overflow-hidden rounded-2xl border backdrop-blur-sm p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${
                            isSelected
                              ? "border-sparkle-primary/30 bg-sparkle-primary/5"
                              : "border-sparkle-border/30 bg-sparkle-card/30 hover:bg-sparkle-card/50"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sparkle-primary/60 to-transparent" />
                          )}

                          <div className="flex items-center gap-3">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={isSelected} onChange={() => toggleApp(appId)} />
                            </div>

                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-sparkle-accent/50 border border-sparkle-border/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                              {app.icon ? (
                                <img
                                  src={app.icon}
                                  alt={app.name}
                                  className="w-7 h-7 object-contain"
                                />
                              ) : (
                                <Download className="w-4 h-4 text-sparkle-text-muted" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-sparkle-text truncate group-hover:text-sparkle-primary transition-colors">
                                  {app.name}
                                </h3>
                                {app.warning && (
                                  <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded shrink-0">
                                    ⚠
                                  </span>
                                )}
                              </div>
                              {app.info && (
                                <p className="text-[11px] text-sparkle-text-muted truncate">
                                  {app.info}
                                </p>
                              )}
                              <p className="text-[10px] text-sparkle-text-muted/60 font-mono truncate mt-0.5">
                                {appId}
                              </p>
                            </div>

                            {app.link && (
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <button
                                  type="button"
                                  aria-label={`Open ${app.name} website`}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-sparkle-accent/50 text-sparkle-text-muted hover:text-sparkle-primary transition-all duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    try {
                                      window.open(app.link, "_blank")
                                    } catch (err) {
                                      console.error("Failed to open external link", err)
                                    }
                                  }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </Suspense>

            <p className="text-center text-xs text-sparkle-text-muted pt-4">
              Request more apps on{" "}
              <a
                href="https://github.com/parcoil/sparkle"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sparkle-primary hover:underline"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </RootDiv>
    </>
  )
}

export default Apps
