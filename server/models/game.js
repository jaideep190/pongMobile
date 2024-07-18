const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
  passkey: String,
  players: [String],
  paddle1Y: Number,
  paddle2Y: Number,
  ballX: Number,
  ballY: Number,
  ballSpeedX: Number,
  ballSpeedY: Number,
  score1: Number,
  score2: Number,
})

module.exports = mongoose.model('Game', gameSchema)