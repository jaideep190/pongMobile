import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'

function Game() {
  const canvasRef = useRef(null)
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [playerNumber, setPlayerNumber] = useState(null)
  const [gameStatus, setGameStatus] = useState('connecting')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const newSocket = io('https://pongmobile.onrender.com')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setGameStatus('joining')
      newSocket.emit('joinGame', location.state.passkey)
    })

    newSocket.on('gameJoined', (number) => {
      setPlayerNumber(number)
    })

    newSocket.on('waiting', () => {
      setGameStatus('waiting')
    })

    newSocket.on('gameStarting', () => {
      setGameStatus('starting')
    })

    newSocket.on('gameStart', () => {
      setGameStatus('playing')
    })

    newSocket.on('gameState', (state) => {
      setGameState(state)
    })

    newSocket.on('gameOver', (winner) => {
      alert(`Game Over! Player ${winner} wins!`)
      navigate('/')
    })

    newSocket.on('playerLeft', () => {
      alert('The other player has left the game.')
      navigate('/')
    })

    newSocket.on('gameFull', () => {
      alert('This game is already full. Please try a different passkey.')
      navigate('/')
    })

    return () => newSocket.close()
  }, [location.state.passkey, navigate])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const drawPaddle = (x, y, width, height) => {
      const radius = height / 2; // Automatically adjusts to new height
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + width, y, x + width, y + height, radius);
      context.arcTo(x + width, y + height, x, y + height, radius);
      context.arcTo(x, y + height, x, y, radius);
      context.arcTo(x, y, x + width, y, radius);
      context.closePath();
      context.fillStyle = '#FFFFFF';
      context.fill();
    }

    const drawBall = (x, y, radius) => {
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = '#FFFFFF'
      context.fill()
      context.closePath()
    }

    const draw = () => {
      if (!gameState) return

      const { width, height } = canvas
      const paddleWidth = width * 0.2
      const paddleHeight = height * 0.02
      const ballRadius = width * 0.015

      context.fillStyle = '#000000'
      context.fillRect(0, 0, width, height)

      if (gameStatus === 'waiting') {
        context.fillStyle = '#FFFFFF'
        context.font = `${width * 0.04}px Arial`
        context.fillText('Waiting for another player...', width * 0.1, height * 0.5)
      } else if (gameStatus === 'starting') {
        context.fillStyle = '#FFFFFF'
        context.font = `${width * 0.04}px Arial`
        context.fillText('Game starting in 3...', width * 0.2, height * 0.5)
      } else if (gameStatus === 'playing') {
        drawPaddle(gameState.paddle1X * width, height - paddleHeight * 2, paddleWidth, paddleHeight)
        drawPaddle(gameState.paddle2X * width, paddleHeight, paddleWidth, paddleHeight)
        drawBall(gameState.ballX * width, gameState.ballY * height, ballRadius)

        context.fillStyle = '#FFFFFF'
        context.font = `${width * 0.06}px Arial`
        context.fillText(gameState.score1, width * 0.1, height * 0.55)
        context.fillText(gameState.score2, width * 0.1, height * 0.45)
      }
    }

    const resizeCanvas = () => {
      const containerWidth = window.innerWidth * 0.9
      const containerHeight = window.innerHeight * 0.8
      const aspectRatio = 16 / 9
      
      let canvasWidth, canvasHeight

      if (containerHeight / containerWidth > aspectRatio) {
        canvasWidth = containerWidth
        canvasHeight = containerWidth * aspectRatio
      } else {
        canvasHeight = containerHeight
        canvasWidth = containerHeight / aspectRatio
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight
      draw()
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [gameState, gameStatus])

  const handleMove = (e) => {
    if (gameStatus === 'playing') {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      let x

      if (e.type === 'touchmove') {
        // Mobile touch event
        const touch = e.touches[0]
        x = (touch.clientX - rect.left) / canvas.width
      } else if (e.type === 'mousemove') {
        // Desktop mouse event
        x = (e.clientX - rect.left) / canvas.width
      }

      if (x !== undefined) {
        socket.emit('paddleMove', { x, playerNumber })
      }
    }
  }

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        onTouchMove={handleMove}
        onMouseMove={handleMove}
        onTouchStart={(e) => e.preventDefault()}
      />
      <div className="game-info">
        <p>You are Player {playerNumber}</p>
        <p>Game Status: {gameStatus}</p>
      </div>
    </div>
  )
}

export default Game