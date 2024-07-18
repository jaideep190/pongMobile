const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "https://pong-mobile.vercel.app",
    methods: ["GET", "POST"]
  }
})

app.use(cors({
  origin: "https://pong-mobile.vercel.app"
}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const BALL_SPEED = 0.005

const games = new Map()

io.on('connection', (socket) => {
  console.log('New client connected')

  socket.on('joinGame', async (passkey) => {
    let game = games.get(passkey)

    if (!game) {
      game = {
        players: [],
        paddle1X: 0.4,
        paddle2X: 0.4,
        ballX: 0.5,
        ballY: 0.5,
        ballSpeedX: BALL_SPEED,
        ballSpeedY: BALL_SPEED,
        score1: 0,
        score2: 0,
        status: 'waiting'
      }
      games.set(passkey, game)
    }

    if (game.players.length >= 2) {
      socket.emit('gameFull')
      return
    }

    game.players.push(socket.id)
    const playerNumber = game.players.length
    socket.join(passkey)
    socket.emit('gameJoined', playerNumber)

    if (game.players.length === 1) {
      io.to(passkey).emit('waiting')
    } else if (game.players.length === 2) {
      game.status = 'starting'
      io.to(passkey).emit('gameStarting')
      setTimeout(() => {
        game.status = 'playing'
        io.to(passkey).emit('gameStart')
        startGame(passkey)
      }, 3000)
    }
  })

  socket.on('paddleMove', ({ x, playerNumber }) => {
    const game = [...games.values()].find(g => g.players.includes(socket.id))
    if (!game || game.status !== 'playing') return

    const paddleX = playerNumber === 1 ? 'paddle1X' : 'paddle2X'
    game[paddleX] = Math.max(0, Math.min(0.8, x))
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected')
    for (const [passkey, game] of games.entries()) {
      const index = game.players.indexOf(socket.id)
      if (index !== -1) {
        game.players.splice(index, 1)
        if (game.players.length === 0) {
          games.delete(passkey)
        } else {
          io.to(passkey).emit('playerLeft')
        }
      }
    }
  })
})

function startGame(passkey) {
  const game = games.get(passkey)
  if (!game) return

  const gameLoop = setInterval(() => {
    if (game.status !== 'playing') {
      clearInterval(gameLoop)
      return
    }

    updateBallPosition(game)
    checkCollision(game)
    checkScore(game)

    io.to(passkey).emit('gameState', {
      paddle1X: game.paddle1X,
      paddle2X: game.paddle2X,
      ballX: game.ballX,
      ballY: game.ballY,
      score1: game.score1,
      score2: game.score2,
    })

    if (game.score1 >= 5 || game.score2 >= 5) {
      clearInterval(gameLoop)
      const winner = game.score1 >= 5 ? 1 : 2
      io.to(passkey).emit('gameOver', winner)
      games.delete(passkey)
    }
  }, 1000 / 60)
}

function updateBallPosition(game) {
  game.ballX += game.ballSpeedX
  game.ballY += game.ballSpeedY
}

function checkCollision(game) {
  if (game.ballX <= 0 || game.ballX >= 1) {
    game.ballSpeedX = -game.ballSpeedX
  }

  if (
    (game.ballY >= 0.93 &&
      game.ballX >= game.paddle1X &&
      game.ballX <= game.paddle1X + 0.2) ||
    (game.ballY <= 0.08 &&
      game.ballX >= game.paddle2X &&
      game.ballX <= game.paddle2X + 0.2)
  ) {
    game.ballSpeedY = -game.ballSpeedY
  }
}

function checkScore(game) {
  if (game.ballY >= 1) {
    game.score2++
    resetBall(game)
  } else if (game.ballY <= 0) {
    game.score1++
    resetBall(game)
  }
}

function resetBall(game) {
  game.ballX = 0.5
  game.ballY = 0.5
  game.ballSpeedX = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED
  game.ballSpeedY = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))