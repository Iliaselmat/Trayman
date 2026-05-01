const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate, requireAdmin)

router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const users = await db.collection('users')
      .find({}, { projection: { password: 0, _id: 0 } })
      .toArray()
    res.json(users)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  const { username, password, name, role } = req.body
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields required' })
  }
  if (!['admin', 'deliverer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or deliverer' })
  }
  try {
    const db = await getDb()
    const existing = await db.collection('users').findOne({ username })
    if (existing) return res.status(409).json({ message: 'Username already exists' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = { id: uuidv4(), username, password: hashedPassword, name, role, createdAt: new Date().toISOString() }
    await db.collection('users').insertOne(newUser)
    const { password: _, _id, ...safe } = newUser
    res.status(201).json(safe)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  const { name, password, role } = req.body
  try {
    const db = await getDb()
    const update = {}
    if (name) update.name = name
    if (role && ['admin', 'deliverer'].includes(role)) update.role = role
    if (password) update.password = await bcrypt.hash(password, 10)
    const result = await db.collection('users').findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: 'after', projection: { password: 0, _id: 0 } }
    )
    if (!result) return res.status(404).json({ message: 'User not found' })
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.collection('users').deleteOne({ id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' })
    res.json({ message: 'User deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
