import React, { Component, type ReactNode } from "react"
import log from "electron-log/renderer"
import { invoke } from "../lib/electron"
import Button from "./ui/button"
import TitleBar from "./titlebar"

const GITHUB_ISSUES = "https://github.com/Parcoil/Sparkle/issues"
const DISCORD_INVITE = "https://discord.com/invite/En5YJYWj3Z"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error("React Error Boundary caught an error:", error, errorInfo)
  }

  handleOpenLogFolder = async () => {
    await invoke({ channel: "open-log-folder" })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const errorMessage =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      const errorStack = this.state.error instanceof Error ? this.state.error.stack : undefined

      return (
        <div className="flex flex-col h-screen bg-sparkle-bg text-sparkle-text items-center justify-center p-8">
          {/* @ts-expect-error */}
          <TitleBar />
          <div className="max-w-xl w-full rounded-2xl border border-sparkle-border bg-sparkle-card/90 backdrop-blur-xl p-8">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-400 mb-2 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sparkle-text-secondary text-sm mb-4">
              Sparkle encountered an unexpected error. Please help us fix it by reporting this
              issue.
            </p>
            <pre className="mb-6 p-4 rounded-xl bg-sparkle-accent/80 text-xs text-sparkle-text font-mono overflow-x-auto overflow-y-auto max-h-40 border border-sparkle-border select-all">
              {errorMessage}
              {errorStack && `\n\n${errorStack}`}
            </pre>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="primary" onClick={this.handleOpenLogFolder} size="md">
                Open Log Folder
              </Button>
              <Button variant="secondary" onClick={this.handleRetry} size="md">
                Try Again
              </Button>
            </div>
            <p className="text-sm text-sparkle-text-muted">
              Please{" "}
              <a
                href={GITHUB_ISSUES}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sparkle-primary hover:underline"
              >
                create a GitHub issue
              </a>{" "}
              or share the error and log file in our{" "}
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sparkle-primary hover:underline"
              >
                Discord
              </a>{" "}
              so we can fix it.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
