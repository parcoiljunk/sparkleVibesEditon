import { useState, useEffect, useMemo } from "react"
import {
  Wrench,
  Search,
  AlertTriangle,
  Monitor,
  Shield,
  Gamepad,
  Network,
  Zap,
  Paintbrush,
  ExternalLink,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Tooltip from "@/components/ui/tooltip"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import useRestartStore from "@/store/restartState"
import useSystemStore from "@/store/systemInfo"
import Button from "@/components/ui/button"
import Toggle from "@/components/ui/Toggle"
import log from "electron-log/renderer"
import posthog from "posthog-js"
import Card from "@/components/ui/Card"
import { Gpu, Plus, RefreshCw } from "lucide-react"
import { LargeInput } from "@/components/ui/input"
import { isNewInCurrentVersion, isUpdatedInCurrentVersion, CURRENT_VERSION } from "@/lib/version"
import { Star } from "lucide-react"
import { Tweak } from "@/types/index"

function Tweaks() {
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [toggleStates, setToggleStates] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [modalContent, setModalContent] = useState<string | boolean | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTweak, setSelectedTweak] = useState<Tweak | null>(null)

  const { setNeedsRestart } = useRestartStore()
  const systemInfo = useSystemStore((state) => state.systemInfo)

  const isTweakCompatible = (tweak) => {
    if (!systemInfo || Object.keys(systemInfo).length === 0) {
      return { compatible: true }
    }

    if (tweak.category && tweak.category.includes("GPU")) {
      if (!systemInfo.hasGPU) {
        return { compatible: false, reason: "Requires a dedicated GPU" }
      }
    }

    if (tweak.name === "optimize-nvidia-settings") {
      if (!systemInfo.isNvidia) {
        return { compatible: false, reason: "Requires an NVIDIA GPU" }
      }
    }

    return { compatible: true }
  }

  useEffect(() => {
    loadTweaks()
    loadToggleStates()
  }, [])

  const loadTweaks = async () => {
    try {
      const fetchedTweaks = await invoke({
        channel: "tweaks:fetch",
      })
      setTweaks(fetchedTweaks)
    } catch (error) {
      console.error("Error fetching tweaks:", error)
      log.error("Error fetching tweaks:", error)
    }
  }

  const loadToggleStates = async () => {
    try {
      const savedStates = await invoke({
        channel: "tweak-states:load",
      })

      if (savedStates) {
        setToggleStates(JSON.parse(savedStates))
      }
    } catch (error) {
      console.error("Error loading toggle states:", error)
      log.error("Error loading toggle states:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveToggleStates = async (newStates) => {
    try {
      await invoke({
        channel: "tweak-states:save",
        payload: JSON.stringify(newStates),
      })
    } catch (error) {
      console.error("Error saving toggle states:", error)
      log.error("Error saving toggle states:", error)
    }
  }

  const applyTweak = async (tweak, _) => {
    const newState = !toggleStates[tweak.name]
    const newStates = {
      ...toggleStates,
      [tweak.name]: newState,
    }

    setToggleStates(newStates)

    const loadingToastId = toast.loading(
      `${newState ? "Applying" : "Unapplying"} tweak: ${tweak.title}`,
    )

    try {
      await saveToggleStates(newStates)

      if (newState) {
        await invoke({
          channel: "tweak:apply",
          payload: tweak.name,
        })
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Applied tweak: ${tweak.title}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        posthog.capture("tweak_applied", {
          tweak_name: tweak.name,
        })
      } else {
        await invoke({
          channel: "tweak:unapply",
          payload: tweak.name,
        })
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Unapplied tweak: ${tweak.title}`,
          type: "info",
          isLoading: false,
          autoClose: 3000,
        })
        posthog.capture("tweak_unapplied", {
          tweak_name: tweak.name,
        })
      }
    } catch (error) {
      console.error(`Error toggling tweak ${tweak.title}:`, error)
      log.error(`Error toggling tweak ${tweak.title}:`, error)

      toast.update(loadingToastId, {
        render: `Failed to ${newState ? "apply" : "unapply"} tweak: ${tweak.title}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })

      const revertedStates = {
        ...newStates,
        [tweak.name]: !newState,
      }

      setToggleStates(revertedStates)

      try {
        await saveToggleStates(revertedStates)
      } catch (err) {
        console.error("Error reverting toggle state:", err)
        log.error("Error reverting toggle state:", err)
      }
    }
  }

  const applyNonReversibleTweak = async (tweak, _) => {
    const newStates = {
      ...toggleStates,
      [tweak.name]: true,
    }

    setToggleStates(newStates)

    const loadingToastId = toast.loading(`Applying tweak: ${tweak.title}`)

    try {
      await saveToggleStates(newStates)
      await invoke({
        channel: "tweak:apply",
        payload: tweak.name,
      })
      if (tweak.restart) {
        setNeedsRestart(true)
      }
      toast.update(loadingToastId, {
        render: `Applied tweak: ${tweak.title}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
      posthog.capture("tweak_applied", {
        tweak_name: tweak.name,
      })
    } catch (error) {
      console.error(`Error applying tweak ${tweak.title}:`, error)
      log.error(`Error applying tweak ${tweak.title}:`, error)
      toast.update(loadingToastId, {
        render: `Failed to apply tweak: ${tweak.title}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
    }
  }

  const handleToggle = async (index) => {
    const tweak: any = tweaks[index]

    if (tweak.modal && !toggleStates[tweak.name]) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }

    await applyTweak(tweak, index)
  }

  const handleButtonClick = async (index) => {
    const tweak: Tweak = tweaks[index]

    if (tweak.modal) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }

    await applyNonReversibleTweak(tweak, index)
  }

  const categories = useMemo(
    () => ["All", ...new Set(tweaks.flatMap((t: any) => t.category || []).filter(Boolean))],
    [tweaks],
  )

  const filteredTweaks: any = useMemo(() => {
    return tweaks.filter((tweak) => {
      const matchesSearch =
        tweak.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tweak.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        activeCategory === "All" ||
        (Array.isArray(tweak.category) && tweak.category.includes(activeCategory)) ||
        tweak.category === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [tweaks, searchTerm, activeCategory])

  // sort this so recommended tweaks are at the top
  const sortedTweaks = useMemo(() => {
    return [...filteredTweaks].sort((a, b) => {
      const aRec: any = !!a.top
      const bRec: any = !!b.top
      return bRec - aRec
    })
  }, [filteredTweaks])

  const categoryIcons = {
    Performance: <Zap className="w-4 h-4 text-amber-400" />,
    GPU: <Gpu className="w-4 h-4 text-rose-400" />,
    Privacy: <Shield className="w-4 h-4 text-emerald-400" />,
    Network: <Network className="w-4 h-4 text-orange-400" />,
    Appearance: <Paintbrush className="w-4 h-4 text-sparkle-primary" />,
    Gaming: <Gamepad className="w-4 h-4 text-teal-400" />,
    General: <Wrench className="w-4 h-4 text-sky-400" />,
  }

  if (isLoading) {
    return (
      <RootDiv>
        <div className="flex items-center justify-center h-full flex-col gap-4">
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-2 border-sparkle-primary/30 border-t-sparkle-primary rounded-full" />
            <div className="absolute inset-0 bg-sparkle-primary/10 blur-xl rounded-full" />
          </div>
          <p className="text-xs font-mono text-sparkle-text-muted tracking-widest uppercase">
            Loading tweaks...
          </p>
        </div>
      </RootDiv>
    )
  }

  return (
    <>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
      >
        <div className="bg-sparkle-card/95 backdrop-blur-xl border border-sparkle-border rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-4">
          <h3 className="text-lg font-semibold text-sparkle-text mb-3 tracking-tight">
            {selectedTweak?.title}
          </h3>
          <div className="text-sparkle-text-secondary text-sm leading-6 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar mb-6">
            {modalContent}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
              }}
            >
              Cancel
            </Button>
            {selectedTweak && (
              <Button
                onClick={async () => {
                  const newState = true
                  const newStates = {
                    ...toggleStates,
                    [selectedTweak.name]: newState,
                  }

                  setToggleStates(newStates)
                  setIsModalOpen(false)

                  const loadingToastId = toast.loading(`Applying tweak: ${selectedTweak.title}`)

                  try {
                    await saveToggleStates(newStates)
                    await invoke({
                      channel: "tweak:apply",
                      payload: selectedTweak.name,
                    })
                    if (selectedTweak.restart) {
                      setNeedsRestart(true)
                    }
                    toast.update(loadingToastId, {
                      render: `Applied tweak: ${selectedTweak.title}`,
                      type: "success",
                      isLoading: false,
                      autoClose: 3000,
                    })
                    posthog.capture("tweak_applied", {
                      tweak_name: selectedTweak.name,
                    })
                  } catch (error) {
                    console.error(`Error applying tweak ${selectedTweak.title}:`, error)
                    log.error(`Error applying tweak ${selectedTweak.title}:`, error)

                    const revertedStates = {
                      ...toggleStates,
                      [selectedTweak.name]: false,
                    }
                    setToggleStates(revertedStates)
                    await saveToggleStates(revertedStates)
                  }
                }}
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="max-w-[1800px] mx-auto">
          {/* ═══════ HEADER & SEARCH ═══════ */}
          <div className="mb-5 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-sparkle-text tracking-tight">
                  System Tweaks
                </h1>
                <p className="text-sm text-sparkle-text-secondary mt-1">
                  <span className="font-mono text-sparkle-primary">{sortedTweaks.length}</span>{" "}
                  optimizations available &middot;{" "}
                  <span className="font-mono text-green-400">
                    {Object.values(toggleStates).filter(Boolean).length}
                  </span>{" "}
                  active
                </p>
              </div>
            </div>

            <LargeInput
              icon={Search}
              placeholder="Search tweaks by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    activeCategory === category
                      ? "bg-sparkle-primary/15 text-sparkle-primary border border-sparkle-primary/30 shadow-[0_0_12px_-4px] shadow-sparkle-primary/20"
                      : "bg-sparkle-card/50 text-sparkle-text-secondary hover:text-sparkle-text hover:bg-sparkle-accent border border-sparkle-border/50"
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  <span className="flex items-center gap-1.5">
                    {category !== "All" && (categoryIcons[category] || categoryIcons["General"])}
                    {category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ═══════ TWEAKS GRID ═══════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-6">
            {sortedTweaks.length > 0 ? (
              sortedTweaks.map((tweak, _) => {
                const originalIndex = tweaks.indexOf(tweak)
                const isActive = toggleStates[tweak.name] || false

                return (
                  <div
                    key={originalIndex}
                    className={`animate-fade-slide-up group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                      isActive
                        ? "border-sparkle-primary/25 bg-sparkle-primary/5 hover:border-sparkle-primary/40"
                        : "border-sparkle-border/30 bg-sparkle-card/30 hover:border-sparkle-border/60 hover:bg-sparkle-card/50"
                    }`}
                    style={{ animationDelay: `${Math.min(_ * 20, 200)}ms` }}
                  >
                    {/* Active indicator glow */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sparkle-primary/60 to-transparent" />
                    )}

                    <div className="p-5 flex flex-col h-[220px]">
                      {/* Top Row: Badges + Toggle */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tweak.warning && (
                            <Tooltip content={tweak.warning} delay={0.3} side="right">
                              <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              </div>
                            </Tooltip>
                          )}
                          {tweak.recommended && (
                            <Tooltip content="Recommended" delay={0.3} side="right">
                              <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors">
                                <Star className="w-3.5 h-3.5 text-green-400 fill-green-400" />
                              </div>
                            </Tooltip>
                          )}
                          {tweak.addedversion &&
                            isNewInCurrentVersion(tweak.addedversion, CURRENT_VERSION) && (
                              <Tooltip
                                content={`New in ${tweak.addedversion}`}
                                delay={0.3}
                                side="right"
                              >
                                <div className="p-1.5 bg-pink-500/10 rounded-lg border border-pink-500/20">
                                  <Plus className="w-3.5 h-3.5 text-pink-400" />
                                </div>
                              </Tooltip>
                            )}
                          {tweak.updatedversion &&
                            isUpdatedInCurrentVersion(tweak.updatedversion, CURRENT_VERSION) && (
                              <Tooltip
                                content={`Updated in ${tweak.updatedversion}`}
                                delay={0.3}
                                side="right"
                              >
                                <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                              </Tooltip>
                            )}
                          {tweak.category &&
                            (Array.isArray(tweak.category) ? tweak.category : [tweak.category]).map(
                              (cat) => (
                                <Tooltip key={cat} content={`${cat}`} delay={0.3} side="right">
                                  <div className="p-1.5 bg-sparkle-accent/60 rounded-lg border border-sparkle-border/30 text-sparkle-text-secondary">
                                    {categoryIcons[cat] || categoryIcons["General"]}
                                  </div>
                                </Tooltip>
                              ),
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            className="px-2! py-1! text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Open Docs"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.open(
                                `https://docs.getsparkle.net/tweaks/${tweak.name}`,
                                "_blank",
                              )
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          {(() => {
                            const compatibility = isTweakCompatible(tweak)
                            return (
                              <>
                                {!compatibility.compatible && (
                                  <Tooltip content={compatibility.reason} delay={0.3} side="right">
                                    <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                      <Monitor className="w-3.5 h-3.5 text-orange-300" />
                                    </div>
                                  </Tooltip>
                                )}
                                {tweak.reversible == null || tweak.reversible == true ? (
                                  <Tooltip
                                    content={
                                      !compatibility.compatible ? compatibility.reason : null
                                    }
                                  >
                                    <Toggle
                                      checked={toggleStates[tweak.name] || false}
                                      onChange={() => handleToggle(originalIndex)}
                                      disabled={!compatibility.compatible}
                                    />
                                  </Tooltip>
                                ) : (
                                  <Tooltip
                                    content={
                                      !compatibility.compatible ? compatibility.reason : null
                                    }
                                  >
                                    <Button
                                      onClick={() => handleButtonClick(originalIndex)}
                                      disabled={!compatibility.compatible}
                                      size="sm"
                                    >
                                      Apply
                                    </Button>
                                  </Tooltip>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="font-semibold text-sparkle-text text-sm leading-tight mb-2 group-hover:text-sparkle-primary transition-colors">
                        {tweak.title}
                      </h2>

                      {/* Description */}
                      <p className="text-sparkle-text-secondary text-xs leading-relaxed flex-1 overflow-y-auto custom-scrollbar pr-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {tweak.description}
                      </p>

                      {/* Bottom Status */}
                      <div className="mt-3 pt-2 border-t border-sparkle-border/20 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? "text-green-400" : "text-sparkle-text-muted/50"}`}
                        >
                          {isActive ? "● Active" : "○ Inactive"}
                        </span>
                        {tweak.restart && (
                          <span className="text-[10px] text-yellow-400/60 font-mono flex items-center gap-1">
                            ⟳ Restart required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-sparkle-card/50 p-6 rounded-2xl mb-4 border border-sparkle-border/30">
                  <Search className="w-10 h-10 text-sparkle-text-muted" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-sparkle-text">No tweaks found</h3>
                <p className="text-sparkle-text-secondary text-sm">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </div>
      </RootDiv>
    </>
  )
}

export default Tweaks
