import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSoundManager } from '../hooks/useSoundManager';
import { blink } from '../blink/client';

// Game constants
const GRID_WIDTH = 19;
const GRID_HEIGHT = 21;
const CELL_SIZE = 20;

// Game entities
const EMPTY = 0;
const WALL = 1;
const PELLET = 2;
const POWER_PELLET = 3;
const PACMAN = 4;
const GHOST = 5;

// Directions
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// Initial maze layout
const INITIAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,1,2,2,1,2,2,1,2,2,2,2,2,1],
  [1,1,1,1,1,2,1,1,0,1,0,1,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,0,0,0,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,0,1,0,1,2,1,1,1,1,1],
  [0,0,0,0,0,2,0,0,1,0,1,0,0,2,0,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,1,1,0,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,0,0,0,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,1,0,1,0,1,1,2,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1],
  [1,3,2,2,1,2,2,2,2,2,2,2,2,2,1,2,2,3,1],
  [1,1,1,2,1,2,1,2,1,1,1,2,1,2,1,2,1,1,1],
  [1,2,2,2,2,2,1,2,2,1,2,2,1,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  id: number;
  position: Position;
  direction: Position;
  color: 'red' | 'pink' | 'blue' | 'orange';
  scared: boolean;
  scaredTimer: number;
}

interface GameState {
  maze: number[][];
  pacman: {
    position: Position;
    direction: Position;
    nextDirection: Position;
  };
  ghosts: Ghost[];
  score: number;
  lives: number;
  level: number;
  gameStatus: 'start' | 'playing' | 'paused' | 'gameOver' | 'levelComplete';
  powerMode: boolean;
  powerModeTimer: number;
}

interface PacmanGameProps {
  user: any;
}

const PacmanGame: React.FC<PacmanGameProps> = ({ user }) => {
  const soundManager = useSoundManager();
  const gameLoopRef = useRef<number>();
  const [isMuted, setIsMuted] = useState(false);
  const gameStartTimeRef = useRef<number>(Date.now());
  const gameStatsRef = useRef({
    pelletsEaten: 0,
    ghostsEaten: 0,
    powerPelletsEaten: 0
  });
  const [gameState, setGameState] = useState<GameState>({
    maze: INITIAL_MAZE.map(row => [...row]),
    pacman: {
      position: { x: 9, y: 15 },
      direction: { x: 0, y: 0 },
      nextDirection: { x: 0, y: 0 }
    },
    ghosts: [
      { id: 1, position: { x: 9, y: 9 }, direction: { x: 0, y: -1 }, color: 'red', scared: false, scaredTimer: 0 },
      { id: 2, position: { x: 8, y: 9 }, direction: { x: 0, y: -1 }, color: 'pink', scared: false, scaredTimer: 0 },
      { id: 3, position: { x: 10, y: 9 }, direction: { x: 0, y: -1 }, color: 'blue', scared: false, scaredTimer: 0 },
      { id: 4, position: { x: 9, y: 10 }, direction: { x: 0, y: -1 }, color: 'orange', scared: false, scaredTimer: 0 }
    ],
    score: 0,
    lives: 3,
    level: 1,
    gameStatus: 'start',
    powerMode: false,
    powerModeTimer: 0
  });

  // Save game session to database
  const saveGameSession = useCallback(async (finalScore: number, finalLevel: number, livesRemaining: number) => {
    if (!user?.id) return;
    
    try {
      const gameDuration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      const stats = gameStatsRef.current;
      
      // Save game session
      const sessionId = `session_${user.id}_${Date.now()}`;
      await blink.db.gameSessions.create({
        id: sessionId,
        userId: user.id,
        score: finalScore,
        level: finalLevel,
        livesRemaining: livesRemaining,
        pelletsEaten: stats.pelletsEaten,
        ghostsEaten: stats.ghostsEaten,
        powerPelletsEaten: stats.powerPelletsEaten,
        gameDuration: gameDuration
      });
      
      // Update user stats
      const userStatsResult = await blink.db.userStats.list({
        where: { userId: user.id },
        limit: 1
      });
      
      if (userStatsResult.length > 0) {
        const currentStats = userStatsResult[0];
        const newTotalGames = currentStats.totalGamesPlayed + 1;
        const newTotalScore = (currentStats.averageScore * currentStats.totalGamesPlayed) + finalScore;
        const newAverageScore = newTotalScore / newTotalGames;
        
        await blink.db.userStats.update(currentStats.id, {
          totalGamesPlayed: newTotalGames,
          highestScore: Math.max(currentStats.highestScore, finalScore),
          highestLevel: Math.max(currentStats.highestLevel, finalLevel),
          totalPelletsEaten: currentStats.totalPelletsEaten + stats.pelletsEaten,
          totalGhostsEaten: currentStats.totalGhostsEaten + stats.ghostsEaten,
          totalPowerPelletsEaten: currentStats.totalPowerPelletsEaten + stats.powerPelletsEaten,
          totalPlaytime: currentStats.totalPlaytime + gameDuration,
          averageScore: newAverageScore
        });
      }
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  }, [user]);

  // Check if position is valid (not a wall)
  const isValidPosition = useCallback((x: number, y: number, maze: number[][]) => {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return false;
    }
    return maze[y][x] !== WALL;
  }, []);

  // Handle tunnel effect (wrap around)
  const wrapPosition = useCallback((pos: Position): Position => {
    let { x } = pos;
    const { y } = pos;
    if (x < 0) x = GRID_WIDTH - 1;
    if (x >= GRID_WIDTH) x = 0;
    return { x, y };
  }, []);

  // Move Pacman
  const movePacman = useCallback((state: GameState): GameState => {
    const newState = { ...state };
    const { pacman, maze } = newState;
    
    // Try to change direction if requested
    const nextPos = {
      x: pacman.position.x + pacman.nextDirection.x,
      y: pacman.position.y + pacman.nextDirection.y
    };
    
    if (isValidPosition(nextPos.x, nextPos.y, maze)) {
      pacman.direction = { ...pacman.nextDirection };
    }
    
    // Move in current direction
    const newPos = wrapPosition({
      x: pacman.position.x + pacman.direction.x,
      y: pacman.position.y + pacman.direction.y
    });
    
    if (isValidPosition(newPos.x, newPos.y, maze)) {
      pacman.position = newPos;
      
      // Check for pellet collection
      const cell = maze[newPos.y][newPos.x];
      if (cell === PELLET) {
        maze[newPos.y][newPos.x] = EMPTY;
        newState.score += 10;
        gameStatsRef.current.pelletsEaten++;
        soundManager.playSound('chomp');
      } else if (cell === POWER_PELLET) {
        maze[newPos.y][newPos.x] = EMPTY;
        newState.score += 50;
        gameStatsRef.current.powerPelletsEaten++;
        newState.powerMode = true;
        newState.powerModeTimer = 30; // 10 seconds at 3fps
        soundManager.playSound('powerPellet');
        
        // Make all ghosts scared
        newState.ghosts = newState.ghosts.map(ghost => ({
          ...ghost,
          scared: true,
          scaredTimer: 30
        }));
      }
    }
    
    return newState;
  }, [isValidPosition, soundManager, wrapPosition]);

  // Simple ghost AI
  const moveGhost = useCallback((ghost: Ghost, maze: number[][], pacmanPos: Position): Ghost => {
    const newGhost = { ...ghost };
    const possibleDirections = [
      DIRECTIONS.UP,
      DIRECTIONS.DOWN,
      DIRECTIONS.LEFT,
      DIRECTIONS.RIGHT
    ].filter(dir => {
      const newPos = wrapPosition({
        x: ghost.position.x + dir.x,
        y: ghost.position.y + dir.y
      });
      return isValidPosition(newPos.x, newPos.y, maze);
    });
    
    if (possibleDirections.length === 0) return newGhost;
    
    // Simple AI: if scared, move away from Pacman, otherwise move towards Pacman
    let bestDirection = possibleDirections[0];
    let bestDistance = ghost.scared ? -Infinity : Infinity;
    
    possibleDirections.forEach(dir => {
      const newPos = wrapPosition({
        x: ghost.position.x + dir.x,
        y: ghost.position.y + dir.y
      });
      
      const distance = Math.abs(newPos.x - pacmanPos.x) + Math.abs(newPos.y - pacmanPos.y);
      
      if (ghost.scared) {
        if (distance > bestDistance) {
          bestDistance = distance;
          bestDirection = dir;
        }
      } else {
        if (distance < bestDistance) {
          bestDistance = distance;
          bestDirection = dir;
        }
      }
    });
    
    newGhost.direction = bestDirection;
    newGhost.position = wrapPosition({
      x: ghost.position.x + bestDirection.x,
      y: ghost.position.y + bestDirection.y
    });
    
    // Update scared timer
    if (newGhost.scared && newGhost.scaredTimer > 0) {
      newGhost.scaredTimer--;
      if (newGhost.scaredTimer <= 0) {
        newGhost.scared = false;
      }
    }
    
    return newGhost;
  }, [isValidPosition, wrapPosition]);

  // Check collisions
  const checkCollisions = useCallback((state: GameState): GameState => {
    const newState = { ...state };
    const { pacman, ghosts } = newState;
    
    ghosts.forEach((ghost, index) => {
      if (ghost.position.x === pacman.position.x && ghost.position.y === pacman.position.y) {
        if (ghost.scared) {
          // Eat ghost
          newState.score += 200;
          gameStatsRef.current.ghostsEaten++;
          soundManager.playSound('ghostEaten');
          newState.ghosts[index] = {
            ...ghost,
            position: { x: 9, y: 9 }, // Return to center
            scared: false,
            scaredTimer: 0
          };
        } else {
          // Pacman dies
          newState.lives--;
          soundManager.playSound('death');
          if (newState.lives <= 0) {
            newState.gameStatus = 'gameOver';
            // Save game session when game ends
            saveGameSession(newState.score, newState.level, 0);
          } else {
            // Reset positions
            newState.pacman.position = { x: 9, y: 15 };
            newState.pacman.direction = { x: 0, y: 0 };
            newState.pacman.nextDirection = { x: 0, y: 0 };
          }
        }
      }
    });
    
    return newState;
  }, [saveGameSession, soundManager]);

  // Check win condition
  const checkWinCondition = useCallback((state: GameState): GameState => {
    const newState = { ...state };
    const { maze } = newState;
    
    // Check if all pellets are collected
    const pelletsRemaining = maze.flat().filter(cell => cell === PELLET || cell === POWER_PELLET).length;
    
    if (pelletsRemaining === 0) {
      newState.gameStatus = 'levelComplete';
      newState.level++;
      soundManager.playSound('levelComplete');
    }
    
    return newState;
  }, [soundManager]);

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;
      
      let newState = { ...prevState };
      
      // Move Pacman
      newState = movePacman(newState);
      
      // Move ghosts
      newState.ghosts = newState.ghosts.map(ghost => 
        moveGhost(ghost, newState.maze, newState.pacman.position)
      );
      
      // Update power mode timer
      if (newState.powerMode && newState.powerModeTimer > 0) {
        newState.powerModeTimer--;
        if (newState.powerModeTimer <= 0) {
          newState.powerMode = false;
          newState.ghosts = newState.ghosts.map(ghost => ({
            ...ghost,
            scared: false,
            scaredTimer: 0
          }));
        } else if (newState.powerModeTimer % 9 === 0) {
          // Play power mode sound every 3 seconds (9 frames at 3fps)
          soundManager.playSound('powerMode');
        }
      }
      
      // Check collisions
      newState = checkCollisions(newState);
      
      // Check win condition
      newState = checkWinCondition(newState);
      
      return newState;
    });
  }, [movePacman, moveGhost, checkCollisions, checkWinCondition, soundManager]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.gameStatus === 'start') {
        soundManager.playSound('gameStart');
        setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
        return;
      }
      
      if (gameState.gameStatus !== 'playing') return;
      
      let newDirection = { x: 0, y: 0 };
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDirection = DIRECTIONS.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newDirection = DIRECTIONS.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDirection = DIRECTIONS.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDirection = DIRECTIONS.RIGHT;
          break;
        case ' ':
          setGameState(prev => ({
            ...prev,
            gameStatus: prev.gameStatus === 'playing' ? 'paused' : 'playing'
          }));
          return;
      }
      
      if (newDirection.x !== 0 || newDirection.y !== 0) {
        setGameState(prev => ({
          ...prev,
          pacman: {
            ...prev.pacman,
            nextDirection: newDirection
          }
        }));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStatus, soundManager]);

  // Start game loop
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, 1000 / 3); // 3 FPS - slower and more playable
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.gameStatus, gameLoop]);

  // Reset game
  const resetGame = () => {
    // Reset game start time and stats
    gameStartTimeRef.current = Date.now();
    gameStatsRef.current = {
      pelletsEaten: 0,
      ghostsEaten: 0,
      powerPelletsEaten: 0
    };
    
    setGameState({
      maze: INITIAL_MAZE.map(row => [...row]),
      pacman: {
        position: { x: 9, y: 15 },
        direction: { x: 0, y: 0 },
        nextDirection: { x: 0, y: 0 }
      },
      ghosts: [
        { id: 1, position: { x: 9, y: 9 }, direction: { x: 0, y: -1 }, color: 'red', scared: false, scaredTimer: 0 },
        { id: 2, position: { x: 8, y: 9 }, direction: { x: 0, y: -1 }, color: 'pink', scared: false, scaredTimer: 0 },
        { id: 3, position: { x: 10, y: 9 }, direction: { x: 0, y: -1 }, color: 'blue', scared: false, scaredTimer: 0 },
        { id: 4, position: { x: 9, y: 10 }, direction: { x: 0, y: -1 }, color: 'orange', scared: false, scaredTimer: 0 }
      ],
      score: 0,
      lives: 3,
      level: 1,
      gameStatus: 'start',
      powerMode: false,
      powerModeTimer: 0
    });
  };

  // Continue to next level
  const nextLevel = () => {
    setGameState(prev => ({
      ...prev,
      maze: INITIAL_MAZE.map(row => [...row]),
      pacman: {
        position: { x: 9, y: 15 },
        direction: { x: 0, y: 0 },
        nextDirection: { x: 0, y: 0 }
      },
      ghosts: [
        { id: 1, position: { x: 9, y: 9 }, direction: { x: 0, y: -1 }, color: 'red', scared: false, scaredTimer: 0 },
        { id: 2, position: { x: 8, y: 9 }, direction: { x: 0, y: -1 }, color: 'pink', scared: false, scaredTimer: 0 },
        { id: 3, position: { x: 10, y: 9 }, direction: { x: 0, y: -1 }, color: 'blue', scared: false, scaredTimer: 0 },
        { id: 4, position: { x: 9, y: 10 }, direction: { x: 0, y: -1 }, color: 'orange', scared: false, scaredTimer: 0 }
      ],
      gameStatus: 'playing',
      powerMode: false,
      powerModeTimer: 0
    }));
  };

  // Render game cell
  const renderCell = (cellType: number, x: number, y: number) => {
    const isPacman = gameState.pacman.position.x === x && gameState.pacman.position.y === y;
    const ghost = gameState.ghosts.find(g => g.position.x === x && g.position.y === y);
    
    let className = 'game-cell ';
    const content = '';
    
    if (isPacman) {
      const direction = gameState.pacman.direction;
      let dirClass = 'right';
      if (direction.x === -1) dirClass = 'left';
      else if (direction.y === -1) dirClass = 'up';
      else if (direction.y === 1) dirClass = 'down';
      
      className += `pacman ${dirClass}`;
    } else if (ghost) {
      className += `ghost ${ghost.color}${ghost.scared ? ' scared' : ''}`;
    } else {
      switch (cellType) {
        case WALL:
          className += 'wall';
          break;
        case PELLET:
          className += 'pellet';
          break;
        case POWER_PELLET:
          className += 'power-pellet';
          break;
        default:
          className += 'bg-black';
      }
    }
    
    return (
      <div key={`${x}-${y}`} className={className}>
        {content}
      </div>
    );
  };

  return (
    <div className="game-container flex flex-col items-center justify-center min-h-screen bg-black text-yellow-400 p-4">
      {/* Game UI */}
      <div className="pixel-font text-center mb-4">
        <div className="flex justify-between items-center w-full max-w-md mb-2">
          <div>SCORE: {gameState.score.toLocaleString()}</div>
          <div>LEVEL: {gameState.level}</div>
          <div>LIVES: {'●'.repeat(gameState.lives)}</div>
        </div>
        
        {/* Sound Control */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => {
              soundManager.toggleMute();
              setIsMuted(!isMuted);
            }}
            className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
          >
            🔊 SOUND: {isMuted ? 'OFF' : 'ON'}
          </button>
        </div>
        
        {gameState.powerMode && (
          <div className="text-blue-400 text-sm">
            POWER MODE: {Math.ceil(gameState.powerModeTimer / 3)}s
          </div>
        )}
        
        {/* Debug info */}
        <div className="text-xs text-gray-400 mt-2">
          Status: {gameState.gameStatus} | Pacman: ({gameState.pacman.position.x}, {gameState.pacman.position.y})
        </div>
      </div>

      {/* Game Board */}
      <div 
        className="game-board border-2 border-blue-500 p-2 bg-black"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`,
          gap: '0px'
        }}
      >
        {gameState.maze.map((row, y) =>
          row.map((cell, x) => renderCell(cell, x, y))
        )}
      </div>

      {/* Game Status Messages */}
      {gameState.gameStatus === 'start' && (
        <div className="pixel-font text-center mt-4">
          <div className="text-2xl mb-2">PAC-MAN</div>
          <div className="text-sm mb-4">Press any arrow key to start</div>
          <div className="text-xs">
            Use arrow keys or WASD to move<br/>
            Space to pause
          </div>
        </div>
      )}

      {gameState.gameStatus === 'paused' && (
        <div className="pixel-font text-center mt-4">
          <div className="text-xl">PAUSED</div>
          <div className="text-sm mt-2">Press Space to continue</div>
        </div>
      )}

      {gameState.gameStatus === 'gameOver' && (
        <div className="pixel-font text-center mt-4">
          <div className="text-2xl text-red-500 mb-2">GAME OVER</div>
          <div className="text-sm mb-4">Final Score: {gameState.score.toLocaleString()}</div>
          <button 
            onClick={resetGame}
            className="bg-yellow-400 text-black px-4 py-2 text-sm hover:bg-yellow-300 transition-colors"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {gameState.gameStatus === 'levelComplete' && (
        <div className="pixel-font text-center mt-4">
          <div className="text-2xl text-green-400 mb-2">LEVEL COMPLETE!</div>
          <div className="text-sm mb-4">Score: {gameState.score.toLocaleString()}</div>
          <button 
            onClick={nextLevel}
            className="bg-yellow-400 text-black px-4 py-2 text-sm hover:bg-yellow-300 transition-colors"
          >
            NEXT LEVEL
          </button>
        </div>
      )}
    </div>
  );
};

export default PacmanGame;