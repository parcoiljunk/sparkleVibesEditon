import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { Home } from "lucide-react"

function Notfound() {
  const navigate = useNavigate()

  return (
    <RootDiv>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-slide-up">
        <div className="relative mb-6">
          <span className="text-[120px] font-black leading-none text-sparkle-text/5 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-sparkle-text tracking-tight">404</span>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-sparkle-text mb-2">Page Not Found</h1>
        <p className="text-sm text-sparkle-text-muted mb-6 max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Button onClick={() => navigate("/")} className="flex items-center gap-2">
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </RootDiv>
  )
}

export default Notfound
