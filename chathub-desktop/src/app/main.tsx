import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { getUserConfig } from '~services/user-config'
import '../services/sentry'
import './base.scss'
import './i18n'
import { router } from './router'

const container = document.getElementById('app')!
const root = createRoot(container)

// Initialize proxy from config
if (window.electronAPI) {
  getUserConfig().then((config) => {
    window.electronAPI!.setProxy({
      mode: config.proxyMode,
      server: config.proxyServer,
    })
  })
}

// Lock to Desktop Environment (using our custom marker)
const isElectron = navigator.userAgent.toLowerCase().includes('(chathub)')

if (isElectron) {
  root.render(<RouterProvider router={router} />)
} else {
  root.render(
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      backgroundColor: '#1a1a1a',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>ChatHub Desktop</h1>
      <p style={{ opacity: 0.8 }}>此应用仅限桌面客户端运行，请启动您的桌面程序。</p>
      <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.5 }}>Please use the desktop application to access this service.</p>
    </div>
  )
}
