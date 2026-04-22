const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { readDb, writeDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, (req, res) => {
  const db = readDb()
  res.json(db.items)
})

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, reference, category, price, weights } = req.body
  if (!name || !reference || !category || price === undefined || !weights?.length) {
    return res.status(400).json({ message: 'All fields required' })
  }
  const db = readDb()
  if (db.items.find(i => i.reference === reference)) {
    return res.status(409).json({ message: 'Reference already exists' })
  }
  const newItem = {
    id: uuidv4(),
    name,
    reference,
    category,
    price: parseFloat(price),
    weights,
    createdAt: new Date().toISOString()
  }
  db.items.push(newItem)
  writeDb(db)
  res.status(201).json(newItem)
})

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, reference, category, price, weights } = req.body
  const db = readDb()
  const idx = db.items.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Item not found' })
  if (name) db.items[idx].name = name
  if (reference) db.items[idx].reference = reference
  if (category) db.items[idx].category = category
  if (price !== undefined) db.items[idx].price = parseFloat(price)
  if (weights) db.items[idx].weights = weights
  writeDb(db)
  res.json(db.items[idx])
})

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = readDb()
  const idx = db.items.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Item not found' })
  db.items.splice(idx, 1)
  writeDb(db)
  res.json({ message: 'Item deleted' })
})

module.exports = router
