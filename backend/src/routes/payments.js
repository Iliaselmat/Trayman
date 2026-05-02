const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate, requireAdmin)

router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const payments = await db.collection('payments')
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray()
    res.json(payments)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  const { delivererId, amount, note } = req.body
  if (!delivererId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'delivererId and positive amount required' })
  }
  try {
    const db = await getDb()
    const deliverer = await db.collection('users').findOne({ id: delivererId, role: 'deliverer' })
    if (!deliverer) return res.status(404).json({ message: 'Deliverer not found' })
    const payment = {
      id: uuidv4(),
      delivererId,
      delivererName: deliverer.name,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      note: note || '',
      recordedBy: req.user.id,
      createdAt: new Date().toISOString()
    }
    await db.collection('payments').insertOne(payment)
    const { _id, ...safe } = payment
    res.status(201).json(safe)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.collection('payments').deleteOne({ id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Payment not found' })
    res.json({ message: 'Payment deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
