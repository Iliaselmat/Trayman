/**
 * Run once to migrate existing db.json data into MongoDB Atlas.
 * Usage: MONGODB_URI="your_uri" node backend/scripts/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Set MONGODB_URI in .env before running this script')
  process.exit(1)
}

const dbPath = path.join(__dirname, '../data/db.json')
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found — nothing to migrate')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))

async function migrate() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db('trayms')

    for (const col of ['users', 'items', 'clients', 'orders']) {
      const docs = data[col]
      if (!docs?.length) { console.log(`${col}: nothing to migrate`); continue }
      await db.collection(col).deleteMany({})
      await db.collection(col).insertMany(docs)
      console.log(`${col}: migrated ${docs.length} document(s)`)
    }

    console.log('\nMigration complete!')
  } finally {
    await client.close()
  }
}

migrate().catch(console.error)
