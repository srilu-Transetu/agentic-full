import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Agentic System | AI Chat Platform',
  description: 'Modern AI-powered chat platform with premium design',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen`}>
        {/* Background decorative elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="blob-purple top-1/4 left-1/4 animate-pulse-slow" />
          <div className="blob-blue bottom-1/4 right-1/4 animate-pulse-slow delay-1000" />
          <div className="blob-purple top-3/4 left-1/2 animate-pulse-slow delay-500" />
        </div>
        
        <main className="min-h-screen">
          {children}
        </main>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'white',
              color: '#374151',
              borderRadius: '12px',
              border: '1px solid #f3f4f6',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: 'white',
              },
              style: {
                borderLeft: '4px solid #10B981',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: 'white',
              },
              style: {
                borderLeft: '4px solid #EF4444',
              },
            },
          }}
        />
      </body>
    </html>
  )
}