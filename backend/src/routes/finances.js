const express = require('express')
const { getDb } = require('../db')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate, requireAdmin)

router.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const [deliverers, orders, payments, clients] = await Promise.all([
      db.collection('users').find({ role: 'deliverer' }, { projection: { _id: 0 } }).toArray(),
      db.collection('orders').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('payments').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
      db.collection('clients').find({}, { projection: { _id: 0 } }).toArray(),
    ])

    const result = deliverers.map(deliverer => {
      const myOrders = orders.filter(o => o.delivererId === deliverer.id)
      const deliveredOrders = myOrders.filter(o => o.status === 'delivered')
      const processingOrders = myOrders.filter(o => o.status === 'processing')
      const myPayments = payments.filter(p => p.delivererId === deliverer.id)

      const deliveredTotal = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const pendingTotal = processingOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const paidTotal = myPayments.reduce((sum, p) => sum + p.amount, 0)

      return {
        delivererId: deliverer.id,
        delivererName: deliverer.name,
        deliveredTotal: parseFloat(deliveredTotal.toFixed(2)),
        pendingTotal: parseFloat(pendingTotal.toFixed(2)),
        paidTotal: parseFloat(paidTotal.toFixed(2)),
        balance: parseFloat((deliveredTotal - paidTotal).toFixed(2)),
        deliveredOrders: deliveredOrders.map(o => ({
          id: o.id,
          clientName: clients.find(c => c.id === o.clientId)?.name || 'Unknown',
          total: o.total || 0,
          createdAt: o.createdAt,
        })),
        payments: myPayments,
      }
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
