const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ createdBy: req.user.id }, { assignedTo: req.user.id }] }
    const clients = await db.collection('clients')
      .find(filter, { projection: { _id: 0 } })
      .toArray()
    res.json(clients)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  const { name, phone, address, lat, lng } = req.body
  if (!name || !phone || !address) {
    return res.status(400).json({ message: 'Name, phone, and address required' })
  }
  try {
    const db = await getDb()
    const newClient = {
      id: uuidv4(), name, phone, address,
      lat: lat ?? null, lng: lng ?? null,
      createdBy: req.user.id,
      assignedTo: req.user.role === 'deliverer' ? req.user.id : null,
      createdAt: new Date().toISOString()
    }
    await db.collection('clients').insertOne(newClient)
    const { _id, ...safe } = newClient
    res.status(201).json(safe)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const client = await db.collection('clients').findOne({ id: req.params.id })
    if (!client) return res.status(404).json({ message: 'Client not found' })
    if (req.user.role === 'deliverer' && client.createdBy !== req.user.id && client.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const { name, phone, address } = req.body
    const update = {}
    if (name) update.name = name
    if (phone) update.phone = phone
    if (address) update.address = address
    const result = await db.collection('clients').findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.collection('clients').deleteOne({ id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Client not found' })
    res.json({ message: 'Client deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/:id/assign', requireAdmin, async (req, res) => {
  const { delivererId } = req.body
  try {
    const db = await getDb()
    if (delivererId) {
      const deliverer = await db.collection('users').findOne({ id: delivererId, role: 'deliverer' })
      if (!deliverer) return res.status(404).json({ message: 'Deliverer not found' })
    }
    const result = await db.collection('clients').findOneAndUpdate(
      { id: req.params.id },
      { $set: { assignedTo: delivererId || null } },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
    if (!result) return res.status(404).json({ message: 'Client not found' })
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
