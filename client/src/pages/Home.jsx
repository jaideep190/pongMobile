import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const [passkey, setPasskey] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/game', { state: { passkey } })
  }

  return (
    <div className="container">
      <h1>Pong Game</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          placeholder="Enter passkey"
          required
        />
        <button type="submit">Join Game</button>
      </form>
    </div>
  )
}

export default Home