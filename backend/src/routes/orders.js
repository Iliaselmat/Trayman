const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { readDb, writeDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', (req, res) => {
  const { startDate, endDate, status } = req.query
  const db = readDb()
  let orders = db.orders

  if (req.user.role === 'deliverer') {
    orders = orders.filter(o => o.delivererId === req.user.id)
  }
  if (status) {
    orders = orders.filter(o => o.status === status)
  }
  if (startDate) {
    orders = orders.filter(o => new Date(o.createdAt) >= new Date(startDate))
  }
  if (endDate) {
    orders = orders.filter(o => new Date(o.createdAt) <= new Date(endDate + 'T23:59:59'))
  }

  const enriched = orders.map(order => {
    const client = db.clients.find(c => c.id === order.clientId)
    const deliverer = db.users.find(u => u.id === order.delivererId)
    const enrichedItems = order.items.map(oi => {
      const item = db.items.find(i => i.id === oi.itemId)
      return { ...oi, itemName: item?.name || 'Unknown' }
    })
    return {
      ...order,
      clientName: client?.name || 'Unknown',
      delivererName: deliverer?.name || 'Unknown',
      items: enrichedItems
    }
  })

  res.json(enriched)
})

router.get('/:id', (req, res) => {
  const db = readDb()
  const order = db.orders.find(o => o.id === req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (req.user.role === 'deliverer' && order.delivererId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const client = db.clients.find(c => c.id === order.clientId)
  const deliverer = db.users.find(u => u.id === order.delivererId)
  const enrichedItems = order.items.map(oi => {
    const item = db.items.find(i => i.id === oi.itemId)
    return { ...oi, itemName: item?.name || 'Unknown' }
  })
  res.json({ ...order, clientName: client?.name, delivererName: deliverer?.name, items: enrichedItems })
})

router.post('/', (req, res) => {
  const { clientId, items, delivererId: requestedDelivererId } = req.body
  if (!clientId || !items?.length) {
    return res.status(400).json({ message: 'Client and items required' })
  }
  const db = readDb()
  const client = db.clients.find(c => c.id === clientId)
  if (!client) return res.status(404).json({ message: 'Client not found' })
  if (req.user.role === 'deliverer' && client.createdBy !== req.user.id && client.assignedTo !== req.user.id) {
    return res.status(403).json({ message: 'Client not assigned to you' })
  }
  const assignedDelivererId = req.user.role === 'admin' && requestedDelivererId
    ? requestedDelivererId
    : req.user.id
  const newOrder = {
    id: uuidv4(),
    clientId,
    delivererId: assignedDelivererId,
    items: items.map(i => ({ itemId: i.itemId, quantity: i.quantity, weight: i.weight })),
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  db.orders.push(newOrder)
  writeDb(db)
  res.status(201).json(newOrder)
})

router.patch('/:id/status', (req, res) => {
  const { status } = req.body
  if (!['processing', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  const db = readDb()
  const idx = db.orders.findIndex(o => o.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Order not found' })
  if (req.user.role === 'deliverer' && db.orders[idx].delivererId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  db.orders[idx].status = status
  db.orders[idx].updatedAt = new Date().toISOString()
  writeDb(db)
  res.json(db.orders[idx])
})

router.delete('/:id', requireAdmin, (req, res) => {
  const db = readDb()
  const idx = db.orders.findIndex(o => o.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Order not found' })
  db.orders.splice(idx, 1)
  writeDb(db)
  res.json({ message: 'Order deleted' })
})

module.exports = router
