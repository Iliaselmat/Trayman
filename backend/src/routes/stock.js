const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// Warehouse stock (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const [stock, items] = await Promise.all([
      db.collection('warehouseStock').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
    ])
    const enriched = stock.map(s => ({
      ...s,
      itemName: items.find(i => i.id === s.itemId)?.name || 'Unknown',
    }))
    res.json(enriched)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Add to warehouse (admin only)
router.post('/add', requireAdmin, async (req, res) => {
  const { itemId, weight, quantity } = req.body
  const qty = parseInt(quantity)
  if (!itemId || !weight || !qty || qty <= 0) {
    return res.status(400).json({ message: 'itemId, weight and positive quantity required' })
  }
  try {
    const db = await getDb()
    const item = await db.collection('items').findOne({ id: itemId })
    if (!item) return res.status(404).json({ message: 'Item not found' })
    const result = await db.collection('warehouseStock').findOneAndUpdate(
      { itemId, weight },
      {
        $inc: { quantity: qty },
        $set: { itemId, weight, updatedAt: new Date().toISOString() },
        $setOnInsert: { id: uuidv4() },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } }
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Remove from warehouse (admin only) - manual adjustment
router.post('/remove', requireAdmin, async (req, res) => {
  const { itemId, weight, quantity } = req.body
  const qty = parseInt(quantity)
  if (!itemId || !weight || !qty || qty <= 0) {
    return res.status(400).json({ message: 'itemId, weight and positive quantity required' })
  }
  try {
    const db = await getDb()
    const current = await db.collection('warehouseStock').findOne({ itemId, weight })
    if (!current || current.quantity < qty) {
      return res.status(400).json({ message: 'Not enough warehouse stock' })
    }
    const result = await db.collection('warehouseStock').findOneAndUpdate(
      { itemId, weight },
      { $inc: { quantity: -qty }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Allocate stock to deliverer (admin only)
router.post('/allocate', requireAdmin, async (req, res) => {
  const { delivererId, itemId, weight, quantity } = req.body
  const qty = parseInt(quantity)
  if (!delivererId || !itemId || !weight || !qty || qty <= 0) {
    return res.status(400).json({ message: 'All fields required' })
  }
  try {
    const db = await getDb()
    const warehouse = await db.collection('warehouseStock').findOne({ itemId, weight })
    if (!warehouse || warehouse.quantity < qty) {
      return res.status(400).json({ message: 'Not enough warehouse stock' })
    }
    const deliverer = await db.collection('users').findOne({ id: delivererId, role: 'deliverer' })
    if (!deliverer) return res.status(404).json({ message: 'Deliverer not found' })

    await db.collection('warehouseStock').updateOne(
      { itemId, weight },
      { $inc: { quantity: -qty }, $set: { updatedAt: new Date().toISOString() } }
    )
    const result = await db.collection('delivererStock').findOneAndUpdate(
      { delivererId, itemId, weight },
      {
        $inc: { quantity: qty },
        $set: { delivererId, itemId, weight, updatedAt: new Date().toISOString() },
        $setOnInsert: { id: uuidv4() },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } }
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// All deliverer allocations (admin only)
router.get('/allocations', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const [alloc, items, users] = await Promise.all([
      db.collection('delivererStock').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('users').find({ role: 'deliverer' }, { projection: { _id: 0 } }).toArray(),
    ])
    res.json(alloc.map(a => ({
      ...a,
      itemName: items.find(i => i.id === a.itemId)?.name || 'Unknown',
      delivererName: users.find(u => u.id === a.delivererId)?.name || 'Unknown',
    })))
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Specific deliverer's stock (admin only)
router.get('/deliverer/:delivererId', requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const [alloc, items] = await Promise.all([
      db.collection('delivererStock').find({ delivererId: req.params.delivererId }, { projection: { _id: 0 } }).toArray(),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
    ])
    res.json(alloc.map(a => ({ ...a, itemName: items.find(i => i.id === a.itemId)?.name || 'Unknown' })))
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Own stock (deliverer)
router.get('/my', async (req, res) => {
  try {
    const db = await getDb()
    const [alloc, items] = await Promise.all([
      db.collection('delivererStock').find({ delivererId: req.user.id }, { projection: { _id: 0 } }).toArray(),
      db.collection('items').find({}, { projection: { _id: 0 } }).toArray(),
    ])
    res.json(alloc.map(a => ({ ...a, itemName: items.find(i => i.id === a.itemId)?.name || 'Unknown' })))
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
