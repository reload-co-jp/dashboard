import { ComponentProps, FC, ReactNode } from "react"

export const Title: FC<ComponentProps<"h1">> = ({
  className = "",
  children,
  ...props
}) => (
  <h1 className={`text-base font-semibold ${className}`} {...props}>
    {children}
  </h1>
)

export const Header: FC<{ children: ReactNode }> = ({ children }) => (
  <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
      {children}
    </div>
  </header>
)

export const Main: FC<{ children: ReactNode }> = ({ children }) => (
  <main className="mx-auto min-h-[calc(100dvh-6rem)] max-w-7xl px-4 py-6 lg:px-8">
    {children}
  </main>
)

export const Footer: FC<{ children: ReactNode }> = ({ children }) => (
  <footer className="mx-auto max-w-7xl px-4 py-4 text-xs text-zinc-500 lg:px-8">
    {children}
  </footer>
)
