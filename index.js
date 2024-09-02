import express from "express"
import bodyParser from "body-parser"
import dotenv from 'dotenv'

dotenv.config()
const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))

app.get("/", async (req, res) => {
  //code
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
