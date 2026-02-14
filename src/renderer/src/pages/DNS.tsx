import { useState, useEffect } from "react"
import { invoke } from "@/lib/electron"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import { Globe, Shield, Settings, RefreshCw, Info } from "lucide-react"
import { Cloud } from "lucide-react"
import log from "electron-log/renderer"
import { Check } from "lucide-react"

interface DNSProvider {
  id: string
  name: string
  primary: string
  secondary: string
  description: string
  features: string[]
  recommended?: boolean
  color: string
  icon: React.ReactElement
}

const dnsProviders = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    primary: "1.1.1.1",
    secondary: "1.0.0.1",
    description: "Fast, secure, and privacy-focused DNS",
    features: ["Fast", "Privacy-focused", "Security"],
    recommended: true,
    color: "text-orange-400",
    icon: <Cloud className="w-5 h-5" />,
  },
  {
    id: "google",
    name: "Google",
    primary: "8.8.8.8",
    secondary: "8.8.4.4",
    description: "Reliable and widely used DNS service",
    features: ["Reliable", "Fast", "Widely supported"],
    color: "text-sky-400",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: "opendns",
    name: "OpenDNS",
    primary: "208.67.222.222",
    secondary: "208.67.220.220",
    description: "Cisco-owned DNS with content filtering",
    features: ["Content filtering", "Reliable", "Security"],
    color: "text-emerald-400",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: "quad9",
    name: "Quad9",
    primary: "9.9.9.9",
    secondary: "149.112.112.112",
    description: "Security-focused DNS with threat blocking",
    features: ["Security", "Threat blocking", "Privacy"],
    color: "text-violet-400",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: "adguard",
    name: "AdGuard DNS",
    primary: "94.140.14.14",
    secondary: "94.140.15.15",
    description: "Blocks ads, trackers, malware",
    features: ["Security", "Threat blocking", "Privacy"],
    color: "text-teal-400",
    icon: <Cloud className="w-5 h-5" />,
  },
  {
    id: "automatic",
    name: "Automatic (DHCP)",
    primary: "Auto",
    secondary: "Auto",
    description: "Use your ISP's default DNS servers",
    features: ["Default", "ISP provided", "No configuration"],
    color: "text-zinc-400",
    icon: <Settings className="w-5 h-5" />,
  },
]

export default function DNSPage() {
  const [selectedProvider, setSelectedProvider] = useState<DNSProvider | null>(null)
  const [currentDNS, setCurrentDNS] = useState<Array<{ adapter: string; servers: string }> | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [customDNS, setCustomDNS] = useState({ primary: "", secondary: "" })
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    getCurrentDNS()
  }, [])

  const getCurrentDNS = async () => {
    try {
      const result = await invoke({
        channel: "dns:get-current",
      })

      if (result.success) {
        setCurrentDNS(result.data)
      }
    } catch (error) {
      console.error("Error getting current DNS:", error)
      log.error("Error getting current DNS:", error)
    }
  }

  const applyDNS = async (provider) => {
    setLoading(true)
    const toastId = toast.loading(`Applying ${provider.name} DNS...`)

    try {
      let payload
      if (provider.id === "custom") {
        payload = {
          dnsType: "custom",
          primaryDNS: customDNS.primary,
          secondaryDNS: customDNS.secondary,
        }
      } else {
        payload = {
          dnsType: provider.id,
        }
      }

      const result = await invoke({
        channel: "dns:apply",
        payload,
      })

      if (result.success) {
        toast.update(toastId, {
          render: `${provider.name} DNS applied successfully!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        await getCurrentDNS()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.update(toastId, {
        render: `Failed to apply DNS: ${error.message}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      })
      log.error("Failed to apply DNS:", error)
    } finally {
      setLoading(false)
      setModalOpen(false)
    }
  }

  const openConfirmationModal = (provider) => {
    setSelectedProvider(provider)
    setModalOpen(true)
  }

  const validateCustomDNS = (dns) => {
    // regex is weird
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(dns)
  }

  const isCustomDNSValid = () => {
    return (
      customDNS.primary &&
      validateCustomDNS(customDNS.primary) &&
      (!customDNS.secondary || validateCustomDNS(customDNS.secondary))
    )
  }

  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="bg-sparkle-card/95 backdrop-blur-xl p-6 rounded-2xl border border-sparkle-border shadow-2xl text-sparkle-text w-[90vw] max-w-md">
          <h2 className="text-lg font-semibold mb-4 tracking-tight">Confirm DNS Change</h2>
          {selectedProvider && (
            <>
              <p className="mb-4 text-sm text-sparkle-text-secondary">
                You are about to change your DNS servers to{" "}
                <span className="text-sparkle-primary font-semibold">{selectedProvider.name}</span>.
              </p>
              <div className="bg-sparkle-accent/80 border border-sparkle-border rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-sparkle-text-secondary text-xs uppercase tracking-wider">
                    Primary
                  </span>
                  <span className="text-sparkle-text font-semibold">
                    {selectedProvider.primary}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-sparkle-text-secondary text-xs uppercase tracking-wider">
                    Secondary
                  </span>
                  <span className="text-sparkle-text font-semibold">
                    {selectedProvider.secondary}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-sparkle-text-muted mb-4 leading-relaxed">
                This will change DNS settings for all active network adapters and flush the DNS
                cache.
              </p>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={() => applyDNS(selectedProvider)} disabled={loading}>
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="max-w-[1600px] mx-auto pb-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-sparkle-text tracking-tight">DNS Manager</h1>
            <p className="text-sm text-sparkle-text-secondary mt-1">
              Configure DNS servers for faster, more secure browsing
            </p>
          </div>

          {/* Current DNS Status */}
          <div
            className="rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-5 mb-6 animate-fade-slide-up"
            style={{ animationDelay: "40ms" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Globe className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-sparkle-text-secondary">
                  Active DNS
                </h2>
              </div>
              <Button onClick={getCurrentDNS} variant="secondary" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {currentDNS && currentDNS.length > 0 ? (
              <div className="space-y-2">
                {currentDNS.map((dns, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-sparkle-accent/30 border border-sparkle-border/20"
                  >
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm font-semibold text-sparkle-text">{dns.adapter}</span>
                    <span className="text-xs text-sparkle-text-muted font-mono ml-auto">
                      {dns.servers}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4 text-sparkle-text-secondary">
                <div className="animate-spin w-4 h-4 border-2 border-sparkle-primary/30 border-t-sparkle-primary rounded-full" />
                <span className="text-sm">Loading network configuration...</span>
              </div>
            )}
          </div>

          {/* DNS Provider Grid */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-sparkle-text-muted" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-sparkle-text-muted/70">
                DNS Providers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dnsProviders.map((provider, i) => (
                <button
                  key={provider.id}
                  onClick={() => openConfirmationModal(provider)}
                  disabled={loading}
                  className="animate-fade-slide-up group relative overflow-hidden rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:bg-sparkle-card/50 hover:border-sparkle-primary/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  style={{ animationDelay: `${80 + i * 40}ms` }}
                >
                  {provider.recommended && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sparkle-primary/60 to-transparent" />
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`p-2.5 rounded-xl bg-sparkle-accent/60 border border-sparkle-border/30 ${provider.color} transition-transform group-hover:scale-110`}
                    >
                      {provider.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-sparkle-text group-hover:text-sparkle-primary transition-colors">
                          {provider.name}
                        </h3>
                        {provider.recommended && (
                          <span className="text-[9px] bg-sparkle-primary/15 text-sparkle-primary border border-sparkle-primary/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-sparkle-text-muted font-mono mt-0.5">
                        {provider.primary} / {provider.secondary}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-sparkle-text-secondary leading-relaxed mb-3">
                    {provider.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {provider.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-sparkle-accent/50 border border-sparkle-border/20 text-[10px] rounded-md text-sparkle-text-secondary font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom DNS Section */}
          <div
            className="animate-fade-slide-up rounded-2xl border border-sparkle-border/30 bg-sparkle-card/30 backdrop-blur-sm p-5"
            style={{ animationDelay: "320ms" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Settings className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm text-sparkle-text">Custom DNS</h2>
                <p className="text-[11px] text-sparkle-text-muted">
                  Enter your own DNS server addresses
                </p>
              </div>
              <Button onClick={() => setShowCustom(!showCustom)} size="sm" variant="secondary">
                {showCustom ? "Hide" : "Configure"}
              </Button>
            </div>

            {showCustom && (
              <div className="space-y-4 mt-5 pt-4 border-t border-sparkle-border/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-sparkle-text-secondary uppercase tracking-widest mb-2">
                      Primary DNS
                    </label>
                    <input
                      type="text"
                      value={customDNS.primary}
                      onChange={(e) =>
                        setCustomDNS((prev) => ({ ...prev, primary: e.target.value }))
                      }
                      placeholder="e.g., 1.1.1.1"
                      className="w-full px-4 py-3 bg-sparkle-accent/50 border border-sparkle-border/50 rounded-xl text-sparkle-text font-mono text-sm focus:outline-hidden focus:border-sparkle-primary/60 focus:shadow-[0_0_16px_-4px] focus:shadow-sparkle-primary/20 transition-all duration-200 placeholder:text-sparkle-text-muted/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-sparkle-text-secondary uppercase tracking-widest mb-2">
                      Secondary DNS <span className="text-sparkle-text-muted">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customDNS.secondary}
                      onChange={(e) =>
                        setCustomDNS((prev) => ({ ...prev, secondary: e.target.value }))
                      }
                      placeholder="e.g., 1.0.0.1"
                      className="w-full px-4 py-3 bg-sparkle-accent/50 border border-sparkle-border/50 rounded-xl text-sparkle-text font-mono text-sm focus:outline-hidden focus:border-sparkle-primary/60 focus:shadow-[0_0_16px_-4px] focus:shadow-sparkle-primary/20 transition-all duration-200 placeholder:text-sparkle-text-muted/40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-sparkle-text-muted">
                  <Info className="w-3.5 h-3.5" />
                  <span>Enter valid IPv4 addresses</span>
                </div>

                <Button
                  onClick={() =>
                    openConfirmationModal({
                      id: "custom",
                      name: "Custom DNS",
                      primary: customDNS.primary,
                      secondary: customDNS.secondary,
                    })
                  }
                  disabled={!isCustomDNSValid() || loading}
                  className="w-full justify-center"
                >
                  Apply Custom DNS
                </Button>
              </div>
            )}
          </div>
        </div>
      </RootDiv>
    </>
  )
}
