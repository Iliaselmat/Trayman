const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { readDb, writeDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, requireAdmin)

router.get('/', (req, res) => {
  const db = readDb()
  const users = db.users.map(({ password, ...rest }) => rest)
  res.json(users)
})

router.post('/', async (req, res) => {
  const { username, password, name, role } = req.body
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields required' })
  }
  if (!['admin', 'deliverer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or deliverer' })
  }
  const db = readDb()
  if (db.users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'Username already exists' })
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    name,
    role,
    createdAt: new Date().toISOString()
  }
  db.users.push(newUser)
  writeDb(db)
  const { password: _, ...userWithoutPassword } = newUser
  res.status(201).json(userWithoutPassword)
})

router.put('/:id', async (req, res) => {
  const { name, password, role } = req.body
  const db = readDb()
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'User not found' })
  if (name) db.users[idx].name = name
  if (role && ['admin', 'deliverer'].includes(role)) db.users[idx].role = role
  if (password) db.users[idx].password = await bcrypt.hash(password, 10)
  writeDb(db)
  const { password: _, ...userWithoutPassword } = db.users[idx]
  res.json(userWithoutPassword)
})

router.delete('/:id', (req, res) => {
  const db = readDb()
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'User not found' })
  db.users.splice(idx, 1)
  writeDb(db)
  res.json({ message: 'User deleted' })
})

module.exports = router
