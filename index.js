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
    rejectUnauthorized: false,
  },
  keepAlive: true, // Ensures the connection stays alive to avoid idle timeouts
})

const connectToDb = async () => {
  try {
    await db.connect()
    console.log("Connected to the database successfully")
  } catch (err) {
    console.error("Connection error", err.stack)
    // Retry connection in case of failure
    setTimeout(connectToDb, 5000) // Retry every 5 seconds
  }
}

connectToDb() // Initial connection attempt

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))

//variables
let currentUserId = 1
let users = []
let currentUser

//functions
async function checkUsers() {
  try{
    let result = await db.query("SELECT * FROM users ORDER BY id ASC")
    //get all users
    users = result.rows
    //get current user
    currentUser = users.find(user => user.id === Number(currentUserId))
    return users
  } catch (error) {
    console.error(error.message)
  }
}

async function checkVisited() {
  try {
    const result = await db.query('SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1', [currentUserId])
    //create countries array of country_code
    let countries = []
      result.rows.forEach((country) => {
      countries.push(country.country_code)
    })
    return countries
  } catch (error) {
    console.error(error.message)
  }
}

app.get("/", async (req, res) => {
  try {
  //get all users to display on the tabs
  const usersResult = await checkUsers()
  //get countries and color with currentUserId
  const countries = await checkVisited()
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: usersResult,
    color: currentUser.color,
  })
  } catch (error) {
    console.error(error.message)
  }
})

app.post("/add", async (req, res) => {
  try {    
    let country = req.body.country
    //throw error if user doesn't type country name
    if (!country){
      throw new Error('Please enter country name')
    }
    //check the country code from countries table/ loosely match the country in case of incomplete name or upper/lowercase with LIKE, wildcards
    let response = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%'|| $1 ||'%'", [country.toLowerCase()])
    // If country_code is not found, no rows were returned, handle the error
    if (response.rowCount === 0) {
      throw new Error('Country does not exist, try again')
    }

    //add countryCode to visited_countries table
    let countryCode = response.rows[0].country_code
    await db.query('INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)',[countryCode, currentUserId])

    //in visited_countries table, country_code is set to unique, it'll show an error 'Duplicate key value violates unique constraint' with error.code === '23505'
    //if countryCode is a new country and get posted, reload the countries with get / after update the country
    res.redirect("/")

  } catch (error) {
    console.error(error.message)
    // modify message for 'Duplicate key value violates unique constraint'
    if (error.code === '23505') {
      error.message = 'Country has already been added, try again'
    }

    //pass all of the data including error message
    const usersResult = await checkUsers()
    const countries = await checkVisited()
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: usersResult,
      color: currentUser.color,
      error: error.message
    })
  }
})

app.post("/user", async (req, res) => {
  try {
    //show pages from selected tab bar
    if (req.body.add){
      res.render("new.ejs")
    }
    if (req.body.user){
    // set currentUserId
    currentUserId = req.body.user
    //get query for visited countries data of that user
    res.redirect("/")
  }
  }catch (error) {
    console.error(error.message)
  }
})

app.post("/new", async (req, res) => {
  try {
    //throw error if name or color is missing
    if (!req.body.name || !req.body.color){
      throw new Error('Please enter your name and select your color')
    }
    //post new user
    let response = await db.query(`INSERT INTO users (name, color) VALUES ($1, $2)`, [req.body.name, req.body.color])
    //if user is posted, redirect to homepage
    if (response.rowCount === 1) {
      res.redirect("/")
    }
  } catch (error) {
    console.error(error.message)
    if (error.code === '23505' && error.constraint === 'users_name_key') {
    // Handle unique constraint violation for username
      return res.render("new.ejs", { error: 'Username already exists' })
    }
    // Handle other types of errors
    return res.render("new.ejs", { error: error.message })
  }
  })

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
