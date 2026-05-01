const { MongoClient } = require('mongodb')

const uri = process.env.MONGODB_URI

// Cache the connection across serverless invocations
let cachedClient = null
let cachedDb = null

async function getDb() {
  if (cachedDb) return cachedDb

  if (!uri) throw new Error('MONGODB_URI environment variable is not set')

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  cachedClient = client
  cachedDb = client.db('trayms')
  return cachedDb
}

module.exports = { getDb }
