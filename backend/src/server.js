require('dotenv').config()
const express = require('express')
const cors = require('cors')
import employeeRoutes from "../routes/employeeRoutes.js"

const app = express();
const port = 4000;

const corsOption = {
  origin : "*"
}

app.use(cors(corsOption));
app.use("/api/employeeRoutes")
app.use((err,req,res,next)=>{
  const statusCode = res.statusCode || 5000;
  const message = err.message || 'Internal server error'
  return app.status(statusCode).json({error: message})
})

app.get("/", (req,res)=>{
  res.send("API Mande somantsara")
})

app.listen(port, ()=>{
  console.log("Server started on localhost:" + port);
})
