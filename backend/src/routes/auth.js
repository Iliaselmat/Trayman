const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getDb } = require('../db')
const { JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' })
  }
  try {
    const db = await getDb()
    const user = await db.collection('users').findOne({ username })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    )
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
