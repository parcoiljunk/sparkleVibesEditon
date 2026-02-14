import { useEffect, useState } from "react"

interface RootDivProps {
  children: React.ReactNode
  [key: string]: any
}

function RootDiv({ children, ...props }: RootDivProps): React.ReactElement {
  const [style, setStyle] = useState({
    opacity: 0,
    transform: "translateY(16px) scale(0.995)",
    transition:
      "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStyle((prev) => ({
        ...prev,
        opacity: 1,
        transform: "translateY(0) scale(1)",
      }))
    }, 10)

    return () => {
      setStyle((prev) => ({
        ...prev,
        opacity: 0,
        transform: "translateY(16px) scale(0.995)",
      }))
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      style={{
        ...style,
        height: "calc(100vh - 50px)",
        overflowY: "auto",
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default RootDiv
