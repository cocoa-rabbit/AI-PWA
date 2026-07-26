import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Multi-LLM PWA Chat',
  description: 'ChatGPT, Gemini, Claude, Grok integrated PWA',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
