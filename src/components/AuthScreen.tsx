import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Label } from './ui/label'
import { blink } from '../blink/client'

interface AuthScreenProps {
  onAuthSuccess: () => void
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    setIsLoading(true)
    setError('')
    try {
      blink.auth.login()
    } catch (err) {
      setError('Login failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Pacman Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🟡</div>
          <h1 className="text-4xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Press Start 2P, monospace' }}>
            PACMAN
          </h1>
          <p className="text-yellow-300 text-sm">Classic Arcade Game</p>
        </div>

        <Card className="bg-gray-900 border-yellow-400 border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-yellow-400" style={{ fontFamily: 'Press Start 2P, monospace' }}>
              PLAYER LOGIN
            </CardTitle>
            <CardDescription className="text-yellow-300">
              Sign in to track your high scores and game progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-900 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3"
              style={{ fontFamily: 'Press Start 2P, monospace' }}
            >
              {isLoading ? 'LOADING...' : 'START GAME'}
            </Button>
            
            <div className="text-center text-xs text-yellow-300 mt-4">
              <p>🟡 Collect all pellets to advance levels</p>
              <p>🔴 Avoid the ghosts or eat power pellets</p>
              <p>⭐ Track your high scores and compete!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}