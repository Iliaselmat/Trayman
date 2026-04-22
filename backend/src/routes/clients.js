const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { readDb, writeDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', (req, res) => {
  const db = readDb()
  if (req.user.role === 'admin') {
    res.json(db.clients)
  } else {
    res.json(db.clients.filter(
      c => c.createdBy === req.user.id || c.assignedTo === req.user.id
    ))
  }
})

router.post('/', (req, res) => {
  const { name, phone, address, lat, lng } = req.body
  if (!name || !phone || !address) {
    return res.status(400).json({ message: 'Name, phone, and address required' })
  }
  const db = readDb()
  const newClient = {
    id: uuidv4(),
    name,
    phone,
    address,
    lat: lat ?? null,
    lng: lng ?? null,
    createdBy: req.user.id,
    assignedTo: req.user.role === 'deliverer' ? req.user.id : null,
    createdAt: new Date().toISOString()
  }
  db.clients.push(newClient)
  writeDb(db)
  res.status(201).json(newClient)
})

router.put('/:id', (req, res) => {
  const db = readDb()
  const idx = db.clients.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Client not found' })
  const client = db.clients[idx]
  if (req.user.role === 'deliverer' && client.createdBy !== req.user.id && client.assignedTo !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const { name, phone, address } = req.body
  if (name) db.clients[idx].name = name
  if (phone) db.clients[idx].phone = phone
  if (address) db.clients[idx].address = address
  writeDb(db)
  res.json(db.clients[idx])
})

router.delete('/:id', requireAdmin, (req, res) => {
  const db = readDb()
  const idx = db.clients.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Client not found' })
  db.clients.splice(idx, 1)
  writeDb(db)
  res.json({ message: 'Client deleted' })
})

router.patch('/:id/assign', requireAdmin, (req, res) => {
  const { delivererId } = req.body
  const db = readDb()
  const idx = db.clients.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Client not found' })
  if (delivererId) {
    const deliverer = db.users.find(u => u.id === delivererId && u.role === 'deliverer')
    if (!deliverer) return res.status(404).json({ message: 'Deliverer not found' })
  }
  db.clients[idx].assignedTo = delivererId || null
  writeDb(db)
  res.json(db.clients[idx])
})

module.exports = router
