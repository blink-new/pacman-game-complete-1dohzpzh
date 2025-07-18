import React, { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { blink } from '../blink/client'

interface UserStats {
  totalGamesPlayed: number
  highestScore: number
  highestLevel: number
  totalPelletsEaten: number
  totalGhostsEaten: number
  totalPowerPelletsEaten: number
  totalPlaytime: number
  averageScore: number
}

interface GameSession {
  id: string
  score: number
  level: number
  livesRemaining: number
  pelletsEaten: number
  ghostsEaten: number
  powerPelletsEaten: number
  gameDuration: number
  completedAt: string
}

interface ProfileScreenProps {
  user: any
  onBackToGame: () => void
  onLogout: () => void
}

export function ProfileScreen({ user, onBackToGame, onLogout }: ProfileScreenProps) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentGames, setRecentGames] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load user stats
      const userStatsResult = await blink.db.userStats.list({
        where: { userId: user.id },
        limit: 1
      })
      
      if (userStatsResult.length > 0) {
        const userStat = userStatsResult[0]
        setStats({
          totalGamesPlayed: userStat.totalGamesPlayed || 0,
          highestScore: userStat.highestScore || 0,
          highestLevel: userStat.highestLevel || 1,
          totalPelletsEaten: userStat.totalPelletsEaten || 0,
          totalGhostsEaten: userStat.totalGhostsEaten || 0,
          totalPowerPelletsEaten: userStat.totalPowerPelletsEaten || 0,
          totalPlaytime: userStat.totalPlaytime || 0,
          averageScore: userStat.averageScore || 0
        })
      } else {
        // Create initial stats record
        await blink.db.userStats.create({
          id: `stats_${user.id}_${Date.now()}`,
          userId: user.id,
          totalGamesPlayed: 0,
          highestScore: 0,
          highestLevel: 1,
          totalPelletsEaten: 0,
          totalGhostsEaten: 0,
          totalPowerPelletsEaten: 0,
          totalPlaytime: 0,
          averageScore: 0
        })
        
        setStats({
          totalGamesPlayed: 0,
          highestScore: 0,
          highestLevel: 1,
          totalPelletsEaten: 0,
          totalGhostsEaten: 0,
          totalPowerPelletsEaten: 0,
          totalPlaytime: 0,
          averageScore: 0
        })
      }
      
      // Load recent game sessions
      const sessions = await blink.db.gameSessions.list({
        where: { userId: user.id },
        orderBy: { completedAt: 'desc' },
        limit: 10
      })
      
      setRecentGames(sessions.map(session => ({
        id: session.id,
        score: session.score,
        level: session.level,
        livesRemaining: session.livesRemaining,
        pelletsEaten: session.pelletsEaten,
        ghostsEaten: session.ghostsEaten,
        powerPelletsEaten: session.powerPelletsEaten,
        gameDuration: session.gameDuration,
        completedAt: session.completedAt
      })))
      
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Press Start 2P, monospace' }}>
              PLAYER PROFILE
            </h1>
            <p className="text-yellow-300">Welcome back, {user.email}!</p>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={onBackToGame}
              className="bg-green-600 hover:bg-green-700 text-white"
              style={{ fontFamily: 'Press Start 2P, monospace' }}
            >
              PLAY GAME
            </Button>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-900"
              style={{ fontFamily: 'Press Start 2P, monospace' }}
            >
              LOGOUT
            </Button>
          </div>
        </div>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900">
            <TabsTrigger value="stats" className="text-yellow-400" style={{ fontFamily: 'Press Start 2P, monospace' }}>
              STATISTICS
            </TabsTrigger>
            <TabsTrigger value="history" className="text-yellow-400" style={{ fontFamily: 'Press Start 2P, monospace' }}>
              GAME HISTORY
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-900 border-yellow-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-yellow-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      HIGH SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.highestScore.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-blue-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-blue-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      GAMES PLAYED
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-green-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      MAX LEVEL
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.highestLevel}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-red-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      AVG SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{Math.round(stats.averageScore).toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-yellow-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-yellow-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      PELLETS EATEN
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.totalPelletsEaten.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-purple-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      GHOSTS EATEN
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.totalGhostsEaten}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-pink-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-pink-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      POWER PELLETS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.totalPowerPelletsEaten}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-cyan-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-cyan-400 text-sm" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                      PLAYTIME
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{formatTime(stats.totalPlaytime)}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-gray-900 border-yellow-400">
              <CardHeader>
                <CardTitle className="text-yellow-400" style={{ fontFamily: 'Press Start 2P, monospace' }}>
                  RECENT GAMES
                </CardTitle>
                <CardDescription className="text-yellow-300">
                  Your last 10 game sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentGames.length === 0 ? (
                  <div className="text-center py-8 text-yellow-300">
                    No games played yet. Start playing to see your history!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-yellow-400">Date</TableHead>
                        <TableHead className="text-yellow-400">Score</TableHead>
                        <TableHead className="text-yellow-400">Level</TableHead>
                        <TableHead className="text-yellow-400">Duration</TableHead>
                        <TableHead className="text-yellow-400">Stats</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentGames.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell className="text-white">{formatDate(game.completedAt)}</TableCell>
                          <TableCell className="text-white font-bold">{game.score.toLocaleString()}</TableCell>
                          <TableCell className="text-white">{game.level}</TableCell>
                          <TableCell className="text-white">{formatTime(game.gameDuration)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                🟡 {game.pelletsEaten}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                👻 {game.ghostsEaten}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                ⭐ {game.powerPelletsEaten}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}