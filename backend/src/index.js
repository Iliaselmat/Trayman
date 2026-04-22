const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { readDb, writeDb } = require('./db')

const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const itemsRoutes = require('./routes/items')
const clientsRoutes = require('./routes/clients')
const ordersRoutes = require('./routes/orders')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

async function seedAdmin() {
  const db = readDb()
  if (db.users.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    db.users.push({
      id: uuidv4(),
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString()
    })
    writeDb(db)
    console.log('Default admin created — username: admin, password: admin123')
  }
}

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/orders', ordersRoutes)

app.listen(PORT, async () => {
  await seedAdmin()
  console.log(`TrayMS backend running on http://localhost:${PORT}`)
})
