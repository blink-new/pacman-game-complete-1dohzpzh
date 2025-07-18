import React, { useState, useEffect } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { ProfileScreen } from './components/ProfileScreen'
import PacmanGame from './components/PacmanGame'
import { blink } from './blink/client'
import './App.css'

type Screen = 'auth' | 'game' | 'profile'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      if (state.user && !state.isLoading) {
        setCurrentScreen('game')
      } else if (!state.user && !state.isLoading) {
        setCurrentScreen('auth')
      }
    })
    
    return unsubscribe
  }, [])

  const handleLogout = () => {
    blink.auth.logout()
    setCurrentScreen('auth')
  }

  const handleShowProfile = () => {
    setCurrentScreen('profile')
  }

  const handleBackToGame = () => {
    setCurrentScreen('game')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl" style={{ fontFamily: 'Press Start 2P, monospace' }}>
          LOADING...
        </div>
      </div>
    )
  }

  if (currentScreen === 'auth') {
    return <AuthScreen onAuthSuccess={() => setCurrentScreen('game')} />
  }

  if (currentScreen === 'profile') {
    return (
      <ProfileScreen 
        user={user} 
        onBackToGame={handleBackToGame}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Game Header with User Info */}
      <div className="bg-gray-900 border-b border-yellow-400 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Press Start 2P, monospace' }}>
              PACMAN
            </h1>
            <div className="text-yellow-300 text-sm">
              Player: {user?.email}
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleShowProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded"
              style={{ fontFamily: 'Press Start 2P, monospace' }}
            >
              PROFILE
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm rounded"
              style={{ fontFamily: 'Press Start 2P, monospace' }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
      
      {/* Game Component */}
      <PacmanGame user={user} />
    </div>
  )
}

export default App