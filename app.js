const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(bodyParser.json())

const appRoute = require('./src/routes/route-table');
app.use('/', appRoute);

app.listen(8080, ()=>{
    console.log('Server Berjalan di Port : 8080');
});