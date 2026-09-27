// Aplica db/schema.sql no banco de DATABASE_URL. Uso: node --env-file=.env.local scripts/db-setup.mjs
import { readFileSync } from 'node:fs'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) throw new Error('Defina DATABASE_URL')
const client = new pg.Client({ connectionString: url, ssl: /sslmode=require|neon\.tech/.test(url) ? { rejectUnauthorized: false } : undefined })
await client.connect()
await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
await client.end()
console.log('Schema aplicado.')
