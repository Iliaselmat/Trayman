const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('./db')

const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const itemsRoutes = require('./routes/items')
const clientsRoutes = require('./routes/clients')
const ordersRoutes = require('./routes/orders')
const paymentsRoutes = require('./routes/payments')
const financesRoutes = require('./routes/finances')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/finances', financesRoutes)

async function seedAdmin() {
  try {
    const db = await getDb()
    const count = await db.collection('users').countDocuments()
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await db.collection('users').insertOne({
        id: uuidv4(),
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      })
      console.log('Default admin created — username: admin, password: admin123')
    }
  } catch (e) {
    console.error('Seed error:', e.message)
  }
}

seedAdmin()

// Local dev only — Vercel handles listening itself
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`TrayMS backend running on http://localhost:${PORT}`)
  })
}

module.exports = app
