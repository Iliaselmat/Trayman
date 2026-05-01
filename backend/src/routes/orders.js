const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  const { startDate, endDate, status } = req.query
  try {
    const db = await getDb()
    const filter = {}
    if (req.user.role === 'deliverer') filter.delivererId = req.user.id
    if (status) filter.status = status
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = startDate
      if (endDate) filter.createdAt.$lte = endDate + 'T23:59:59'
    }

    const [orders, clients, users, items] = await Promise.all([
      db.collection('orders').find(filter, { projection: { _id: 0 } }).toArray(),
      db.collection('clients').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('users').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
    ])

    const enriched = orders.map(order => {
      const client = clients.find(c => c.id === order.clientId)
      const deliverer = users.find(u => u.id === order.delivererId)
      return {
        ...order,
        clientName: client?.name || 'Unknown',
        delivererName: deliverer?.name || 'Unknown',
        items: order.items.map(oi => ({
          ...oi,
          itemName: items.find(i => i.id === oi.itemId)?.name || 'Unknown'
        }))
      }
    })
    res.json(enriched)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const order = await db.collection('orders').findOne({ id: req.params.id }, { projection: { _id: 0 } })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (req.user.role === 'deliverer' && order.delivererId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const [client, deliverer, items] = await Promise.all([
      db.collection('clients').findOne({ id: order.clientId }, { projection: { _id: 0 } }),
      db.collection('users').findOne({ id: order.delivererId }, { projection: { _id: 0 } }),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
    ])
    res.json({
      ...order,
      clientName: client?.name,
      delivererName: deliverer?.name,
      items: order.items.map(oi => ({
        ...oi,
        itemName: items.find(i => i.id === oi.itemId)?.name || 'Unknown'
      }))
    })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  const { clientId, items, delivererId: requestedDelivererId } = req.body
  if (!clientId || !items?.length) {
    return res.status(400).json({ message: 'Client and items required' })
  }
  try {
    const db = await getDb()
    const client = await db.collection('clients').findOne({ id: clientId })
    if (!client) return res.status(404).json({ message: 'Client not found' })
    if (req.user.role === 'deliverer' && client.createdBy !== req.user.id && client.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Client not assigned to you' })
    }
    const assignedDelivererId = req.user.role === 'admin' && requestedDelivererId
      ? requestedDelivererId
      : req.user.id
    const newOrder = {
      id: uuidv4(), clientId,
      delivererId: assignedDelivererId,
      items: items.map(i => ({ itemId: i.itemId, quantity: i.quantity, weight: i.weight })),
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await db.collection('orders').insertOne(newOrder)
    const { _id, ...safe } = newOrder
    res.status(201).json(safe)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  if (!['processing', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  try {
    const db = await getDb()
    const order = await db.collection('orders').findOne({ id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (req.user.role === 'deliverer' && order.delivererId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const result = await db.collection('orders').findOneAndUpdate(
      { id: req.params.id },
      { $set: { status, updatedAt: new Date().toISOString() } },
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
    const result = await db.collection('orders').deleteOne({ id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Order not found' })
    res.json({ message: 'Order deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
