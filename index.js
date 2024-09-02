import express from "express"
import bodyParser from "body-parser"
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
// Disable SSL verification globally (for development purposes only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const app = express()
const port = process.env.PORT || 3000

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

db.connect().catch(err => {
  console.error('Connection error', err.stack);
})
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))

//variables
let currentUserId = 1
let users = []
let currentUser

//functions
async function checkUsers() {
  try{
    let result = await db.query("SELECT * FROM users")
    //get all users
    users = result.rows
    //get current user
    currentUser = users.find(user => user.id === Number(currentUserId))
    return users
  } catch (error) {
    console.error(error.message)
  }
}

app.get("/", async (req, res) => {
  //code
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
