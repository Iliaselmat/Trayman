const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    const items = await db.collection('items')
      .find({}, { projection: { _id: 0 } })
      .toArray()
    res.json(items)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, reference, category, weights } = req.body
  if (!name || !reference || !category || !weights?.length) {
    return res.status(400).json({ message: 'All fields required' })
  }
  const invalid = weights.some(w => !w.weight || w.price === undefined || parseFloat(w.price) <= 0)
  if (invalid) return res.status(400).json({ message: 'Each weight must have a positive price' })
  try {
    const db = await getDb()
    const existing = await db.collection('items').findOne({ reference })
    if (existing) return res.status(409).json({ message: 'Reference already exists' })
    const newItem = {
      id: uuidv4(), name, reference, category,
      weights: weights.map(w => ({ weight: w.weight, price: parseFloat(parseFloat(w.price).toFixed(2)) })),
      createdAt: new Date().toISOString()
    }
    await db.collection('items').insertOne(newItem)
    const { _id, ...safe } = newItem
    res.status(201).json(safe)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, reference, category, weights } = req.body
  try {
    const db = await getDb()
    const update = {}
    if (name) update.name = name
    if (reference) update.reference = reference
    if (category) update.category = category
    if (weights) {
      const invalid = weights.some(w => !w.weight || w.price === undefined || parseFloat(w.price) <= 0)
      if (invalid) return res.status(400).json({ message: 'Each weight must have a positive price' })
      update.weights = weights.map(w => ({ weight: w.weight, price: parseFloat(parseFloat(w.price).toFixed(2)) }))
    }
    const result = await db.collection('items').findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
    if (!result) return res.status(404).json({ message: 'Item not found' })
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.collection('items').deleteOne({ id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Item not found' })
    res.json({ message: 'Item deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
