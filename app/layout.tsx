import React from "react"
import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono, Archivo_Black } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-sans'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
});

const archivoBlack = Archivo_Black({ 
  weight: "400",
  subsets: ["latin"],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: 'Art-du-Kivu | Administration',
  description: 'Interface d\'administration pour la plateforme culturelle Art-du-Kivu - Promotion des talents artistiques du Kivu, RDC',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} ${archivoBlack.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
