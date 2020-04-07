'use strict';
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const PORT = process.env.PORT || 4000;
const app = express();
// make a connection to the psql using the provided link
const client = new pg.Client(process.env.DATABASE_URL);

client.on('error', (err) => {
  throw new Error(err);
});
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

app.get('/', (request, response) => {
  response.send('Home Page !');
});

app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailsHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);


function checkLocation (city){
  let SQL = 'SELECT * FROM locations WHERE search_query = ($1)';
  let cityValue = [city];
  return client.query(SQL, cityValue);
}
function locationHandler(request, response) {
    // try {
    //     const geoData = require('./data/geo.json');
    //     const city = request.query.city;
    //     const locationData = new Location(city, geoData);
    //     response.status(200).json(locationData);
    // } catch (error) {
    //     errorHandler(error, request, response);
    // }
    const city = request.query.city;
    superagent(
        `https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
    )
        .then((res) => {
            const geoData = res.body;
            const locationData = new Location(city, geoData);
            response.status(200).json(locationData);
        })
        .catch((error) => errorHandler(error, request, response));
}

function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}
/////////////////////////////////////////////
function weatherHandler(request, response) {
    // try {
    //     const weatherAll = [];
    //     const weatherData = require('./data/darksky.json');
    //     for (let i = 0; i < weatherData.data.length; i++) {
    //       const locationData = new Weather(weatherData, i);
    //       weatherAll.push(locationData);
    //     }
    //     response.status(200).json(weatherAll);
    //   } catch (error) {
    //     errorHandler(error, request, response);
    //   }
    superagent(
        `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
    )
        .then((weatherData) => {
            const locationData = weatherData.body.data.map((day) => {
                return new Weather(day);
            });
            response.status(200).json(locationData);
        })
        .catch((error) => errorHandler(error, request, response))
}
function Weather(day) {
    this.forecast = day.weather.description;
    this.time = new Date(day.valid_date).toString().split(' ').slice(0, 4).join(' ');
}
//////////////////////////////////////////
function trailsHandler(request, response) {
    superagent(
        `https://www.hikingproject.com/data/get-trails?lat=${request.query.latitude}&lon=${request.query.longitude}&maxDistance=400&key=${process.env.TRAIL_API_KEY}`
    )
    .then((trialData) => {
        const TData = trialData.body.trails.map((TT) => {
            return new Trails(TT);
        });
        response.status(200).json(TData);
    })
    .catch((error) => errorHandler(error, request, response))
}

function Trails(TT) {
    this.name = TT.name;
    this.location = TT.location;
    this.length = TT.length;
    this.stars = TT.stars;
    this.star_votes = TT.star_votes;
    this.summary = TT.summary;
    this.trail_url = TT.trail_url;
    this.conditions = TT.conditions;
    this.condition_date =TT.conditionDate.split(' ')[0];
    this.condition_time =TT.conditionDate.split(' ')[1];
}
//////////////////////////////////////////
function notFoundHandler(request, response) {
    response.status(404).send('NOT FOUND!');
  }
  
  function errorHandler(error, request, response) {
    response.status(500).send(error);
  }
app.listen(PORT, () => console.log(`the server is up and running on ${PORT}`));