'use strict';
require('dotenv').config();
const pg = require('pg');
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const PORT = process.env.PORT;
const app = express();
app.use(cors());
app.get('/', (request, response) => {
  response.send('Home Page!');
});
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => {
    throw new Error(err);
});
app.get('/location', locationHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);
function locationHandler(request, response) {
  const city = request.query.city;
  console.log(city);
  const dataBaseCityQuery = 'SELECT search_query, formatted_query, latitude, longitude FROM thelocations WHERE search_query LIKE $1'
  client.query(dataBaseCityQuery, [city]).then((result) => {
    if (result.rows.length > 0) {
      console.log('hi')
          response.status(200).json(result.rows[0]);
      }
  else {
    superagent(
      `https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
    ).then((res) => {
        const geoData = res.body;
        const locationData = new Location(city, geoData);
        const SQL = 'INSERT INTO thelocations(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
        const safeValues = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];
        client.query(SQL, safeValues).then(result => {
            response.status(200).json(locationData);
          })
          .catch(err => {
              response.status(500).send(err);
          })
  })
  .catch((err) => {
      errorHandler(err, request, response);
  });
  }
});}
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}
function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}
function errorHandler(error, request, response) {
  response.status(500).send(error);
}
client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`my server is up and running on port ${PORT}`)
    );
  })
  .catch((err) => {
    throw new Error(`startup error ${err}`);
  });