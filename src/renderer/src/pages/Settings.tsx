import RootDiv from "@/components/rootdiv"
import { useEffect, useState } from "react"
import jsonData from "../../../../package.json"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import Toggle from "@/components/ui/Toggle"
import { toast } from "react-toastify"
import { Dropdown } from "@/components/ui/dropdown"

const themes = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Purple", value: "purple" },
  { label: "Gray", value: "gray" },
  { label: "Classic", value: "classic" },
]

function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system")
  const [checking, setChecking] = useState(false)
  const [discordEnabled, setDiscordEnabled] = useState(true)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [trayEnabled, setTrayEnabled] = useState(true)
  const [trayLoading, setTrayLoading] = useState(false)
  const [posthogDisabled, setPosthogDisabled] = useState(() => {
    return localStorage.getItem("posthogDisabled") === "true"
  })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [defaultPackageManager, setDefaultPackageManager] = useState<"Chocolatey" | "Winget">(
    (localStorage.getItem("defaultPackageManager") as "Chocolatey" | "Winget") || "Winget",
  )

  const checkForUpdates = async () => {
    try {
      setChecking(true)
      const res = await invoke({ channel: "updater:check" })
      if (res?.ok && !res.updateInfo) {
        toast.success("You're up to date")
      } else if (res?.updateInfo) {
        toast.info(`Update available: ${res.updateInfo.version}`)
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    document.body.classList.remove("light", "purple", "dark", "gray", "classic")
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      document.body.classList.add(systemTheme)
    } else if (theme) {
      document.body.classList.add(theme)
    } else {
      document.body.classList.add("dark")
    }
    localStorage.setItem("theme", theme || "dark")
  }, [theme])

  useEffect(() => {
    invoke({ channel: "discord-rpc:get" }).then((status) => setDiscordEnabled(status))
    invoke({ channel: "tray:get" }).then((status) => setTrayEnabled(status))
  }, [])

  useEffect(() => {
    if (posthogDisabled) {
      document.body.classList.add("ph-no-capture")
    } else {
      document.body.classList.remove("ph-no-capture")
    }
    localStorage.setItem("posthogDisabled", posthogDisabled.toString())
  }, [posthogDisabled])

  const handleToggleDiscord = async () => {
    setDiscordLoading(true)
    const newStatus = !discordEnabled
    await invoke({ channel: "discord-rpc:toggle", payload: newStatus })
    setDiscordEnabled(newStatus)
    setDiscordLoading(false)
  }

  const clearCache = async () => {
    await invoke({ channel: "clear-sparkle-cache" })
    localStorage.removeItem("sparkle:systemInfo")
    localStorage.removeItem("sparkle:tweakInfo")
    toast.success("Sparkle cache cleared successfully!")
  }

  const handleToggleTray = async () => {
    setTrayLoading(true)
    const newStatus = !trayEnabled
    await invoke({ channel: "tray:set", payload: newStatus })
    setTrayEnabled(newStatus)
    setTrayLoading(false)
  }

  const handleRestartExplorer = async () => {
    try {
      await invoke({ channel: "restart-explorer" })
      toast.success("Explorer restarted successfully")
    } catch (e) {
      toast.error("Failed to restart explorer: " + String(e))
    }
  }

  return (
    <>
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <div className="bg-sparkle-card/95 backdrop-blur-xl border border-sparkle-border/50 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-sparkle-text tracking-tight">
                Delete Legacy Backups
              </h2>
              <p className="text-xs text-sparkle-text-muted">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-sparkle-text-secondary leading-relaxed mb-4">
            This will permanently delete{" "}
            <code className="bg-sparkle-accent/50 px-1.5 py-0.5 rounded text-xs font-mono text-sparkle-text">
              C:\Sparkle\Backup
            </code>{" "}
            and all its contents.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteModalOpen(false)
                invoke({ channel: "delete-old-sparkle-backups" })
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <RootDiv>
        <div className="max-w-[900px] mx-auto pb-16">
          {/* Header */}
          <div className="mb-6 animate-fade-slide-up">
            <h1 className="text-2xl font-bold text-sparkle-text tracking-tight">Settings</h1>
            <p className="text-sm text-sparkle-text-secondary mt-1">
              Sparkle v{jsonData.version} — Customize your experience
            </p>
          </div>

          <div className="space-y-4">
            {/* Theme */}
            <SettingSection title="Appearance" delay={40}>
              <div className="space-y-3">
                <p className="text-xs text-sparkle-text-muted">Choose your preferred theme</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {themes.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center justify-center cursor-pointer p-2.5 rounded-xl border transition-all duration-200 active:scale-95 text-sm font-medium ${
                        theme === t.value
                          ? "border-sparkle-primary/50 bg-sparkle-primary/10 text-sparkle-primary shadow-[0_0_16px_-4px] shadow-sparkle-primary/20"
                          : "border-sparkle-border/30 hover:border-sparkle-border/60 text-sparkle-text-secondary hover:text-sparkle-text"
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={t.value}
                        checked={theme === t.value}
                        onChange={() => setTheme(t.value)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            </SettingSection>

            {/* Profile */}
            <SettingSection title="Profile" delay={80}>
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-sparkle-text-secondary uppercase tracking-widest">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={localStorage.getItem("sparkle:user") || ""}
                    onChange={(e) => localStorage.setItem("sparkle:user", e.target.value)}
                    className="flex-1 bg-sparkle-accent/50 border border-sparkle-border/50 rounded-xl px-4 py-2.5 text-sparkle-text text-sm focus:outline-hidden focus:border-sparkle-primary/60 focus:shadow-[0_0_16px_-4px] focus:shadow-sparkle-primary/20 transition-all placeholder:text-sparkle-text-muted/40"
                    placeholder="Enter your name"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const username = await invoke({ channel: "get-user-name" })
                      localStorage.setItem("sparkle:user", username)
                      toast.success("Name reset to system user")
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </SettingSection>

            {/* Integrations */}
            <SettingSection title="Integrations" delay={120}>
              <SettingRow
                title="Discord Rich Presence"
                description="Show Sparkle activity on Discord"
              >
                <Toggle
                  checked={discordEnabled}
                  onChange={handleToggleDiscord}
                  disabled={discordLoading}
                />
              </SettingRow>
              <div className="h-px bg-sparkle-border/15 mx-1" />
              <SettingRow
                title="Default Package Manager"
                description="Used for app installs in the Apps page"
              >
                <Dropdown
                  value={defaultPackageManager}
                  options={["Winget", "Chocolatey"]}
                  onChange={(value) => {
                    setDefaultPackageManager(value as "Chocolatey" | "Winget")
                    localStorage.setItem("defaultPackageManager", value)
                  }}
                />
              </SettingRow>
            </SettingSection>

            {/* Privacy */}
            <SettingSection title="Privacy" delay={160}>
              <SettingRow
                title="Disable Analytics"
                description="Opt out of Posthog analytics"
                badge="Requires restart"
              >
                <Toggle checked={posthogDisabled} onChange={() => setPosthogDisabled((v) => !v)} />
              </SettingRow>
            </SettingSection>

            {/* System */}
            <SettingSection title="System" delay={200}>
              <SettingRow
                title="System Tray Icon"
                description="Keep Sparkle running in the tray"
                badge="Requires restart"
              >
                <Toggle checked={trayEnabled} onChange={handleToggleTray} disabled={trayLoading} />
              </SettingRow>
              <div className="h-px bg-sparkle-border/15 mx-1" />
              <SettingRow title="Check for Updates" description={`Current: v${jsonData.version}`}>
                <Button onClick={checkForUpdates} disabled={checking} size="sm">
                  {checking ? "Checking..." : "Check"}
                </Button>
              </SettingRow>
              <div className="h-px bg-sparkle-border/15 mx-1" />
              <SettingRow title="Restart Explorer" description="Restart Windows Explorer & Taskbar">
                <Button variant="secondary" size="sm" onClick={handleRestartExplorer}>
                  Restart
                </Button>
              </SettingRow>
            </SettingSection>

            {/* Data */}
            <SettingSection title="Data Management" delay={240}>
              <SettingRow title="Clear Cache" description="Remove temporary Sparkle files & logs">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={clearCache}>
                    Clear
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => invoke({ channel: "open-log-folder" })}
                  >
                    Logs
                  </Button>
                </div>
              </SettingRow>
              <div className="h-px bg-sparkle-border/15 mx-1" />
              <SettingRow
                title="Legacy Backups"
                description="Delete old backups from C:\Sparkle\Backup"
              >
                <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
                  Delete
                </Button>
              </SettingRow>
            </SettingSection>

            {/* About */}
            <div
              className="animate-fade-slide-up text-center text-xs text-sparkle-text-muted/50 pt-4"
              style={{ animationDelay: "280ms" }}
            >
              Sparkle v{jsonData.version} — © {new Date().getFullYear()} Parcoil Network
            </div>
          </div>
        </div>
      </RootDiv>
    </>
  )
}

const SettingSection = ({
  title,
  children,
  delay = 0,
}: {
  title: string
  children: React.ReactNode
  delay?: number
}) => (
  <div
    className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="px-5 py-3 border-b border-sparkle-border/15">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-sparkle-text-muted/70">
        {title}
      </h2>
    </div>
    <div className="p-5 space-y-3">{children}</div>
  </div>
)

const SettingRow = ({
  title,
  description,
  badge,
  children,
}: {
  title: string
  description: string
  badge?: string
  children: React.ReactNode
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-sparkle-text">{title}</h3>
        {badge && (
          <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[11px] text-sparkle-text-muted">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)
export default Settings
