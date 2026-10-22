import pg from 'pg'
import env from 'dotenv'
env.config()

const requireEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME"
]

requireEnvVars.forEach((varName)=>{
  if(!process.env[varName]){
    console.log(`Missing require env variable: ${varName}`);
    process.exit()
  }
});

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

db.connect().then(()=> console.log("Database is connected")).catch((err)=>{
  console.log("Connection denied");
  process.exit(1)
})

db.on("error", (err)=>{
  console.log('Database error:' , err)
});


export const query = (text, params) => db.query(text,params)
