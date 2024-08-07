const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const path = require('path')
const dbpath = path.join(__dirname, 'covid19IndiaPortal.db')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
let db = null
const intializeDbPath = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('succesful http://lochalhost:3000/')
    })
  } catch (e) {
    console.log(`DB error ${e.message}`)
    process.exit(1)
  }
}
intializeDbPath()

const authorization1 = (request, response, next) => {
  let jwtToken
  const header = request.headers['authorization']
  if (header !== undefined) {
    jwtToken = header.split(' ')[1]
  }
  if (header === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'bhbabdsbcnljqwdbc', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const retriveSql = `SELECT * FROM user
    WHERE username = "${username}";`
  const singleRow = await db.get(retriveSql)
  if (singleRow === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const comparision = await bcrypt.compare(password, singleRow.password)
    if (comparision === true) {
      const payload = {username: username}
      const jwtData = jwt.sign(payload, 'bhbabdsbcnljqwdbc')
      response.send({jwtToken: jwtData})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/states/', authorization1, async (request, response) => {
  const allObjects = `
  SELECT state_id AS stateId,
  state_name AS stateName, population
  FROM state;`
  const returnList = await db.all(allObjects)
  response.send(returnList)
})

app.get('/states/:stateId/', authorization1, async (request, response) => {
  const {stateId} = request.params
  const getOneRow = `
  SELECT state_id AS stateId,
  state_name AS stateName, population
  FROM state
  WHERE state_id = ${stateId};`
  const returnOneList = await db.get(getOneRow)
  response.send(returnOneList)
})

app.post('/districts/', authorization1, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const insertData = `INSERT INTO district
  (district_name, state_id, cases, cured, active, deaths)
  VALUES ("${districtName}", ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`
  await db.run(insertData)
  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',
  authorization1,
  async (request, response) => {
    const {districtId} = request.params
    const api5 = `SELECT
  district_id AS districtId,
  district_name AS districtName,
  state_id AS stateId,
  cases, cured, active, deaths FROM district
  WHERE district_id = ${districtId};`
    const api5re = await db.get(api5)
    response.send(api5re)
  },
)

app.delete(
  '/districts/:districtId/',
  authorization1,
  async (request, response) => {
    const {districtId} = request.params
    const api6 = `DELETE FROM district
  WHERE district_id = ${districtId};`
    await db.run(api6)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  authorization1,
  async (request, response) => {
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const {districtId} = request.params
    const api7 = `UPDATE district
  SET
  district_name = "${districtName}",
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured}, active = ${active}, deaths = ${deaths}
  WHERE district_id = ${districtId};`
    await db.run(api7)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authorization1,
  async (request, response) => {
    const {stateId} = request.params
    const api8 = `SELECT 
    SUM(cases) AS totalCases,
    SUM(cured) AS totalCured,
    SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId};`
    const lastApi = await db.get(api8)
    response.send(lastApi)
  },
)

module.exports = app
