const express = require('express');
const axios = require('axios');
const port = process.env.PORT || 3000

const app = express();
app.get('/people', handleGetPeople);
app.get('/planets', handleGetPlanets);

app.listen(port);
console.log(`Listening on port ${port}`);

function handleGetPeople(req,res){
  fetchAllResults('https://swapi.co/api/people/?page=1', (err, people) => {
    if(err) return sendAPIError(res);
    sortPeople(people, req.query.sortBy)
    res.send(people);
  });
}

function handleGetPlanets(req, res){
  fetchAllResults('https://swapi.co/api/planets/?page=1', (err, planets) => {
    if(err) return sendAPIError(res);
    populatePlanets(planets, err => {
      if(err) return sendAPIError(res);
        res.send(planets);
    });
  });
}

function fetchAllResults(url,callBack) {
  let results;

  axios.get(url)
    .then(res => {
      results = res.data.results;
      let pages = Math.ceil(res.data.count / res.data.results.length);
      return fetchRemainingResultsAsync(url, pages);
    })
    .then(resArr => {
      resArr = resArr.map(r => r.data.results);
      callBack(null,results.concat(...resArr));
    })
    .catch(callBack);
}

function fetchRemainingResultsAsync(url, pages) {
  let promises = [];

  for (let i = 2; i <= pages; i++) {
    let pageUrl = url.replace(/\d+$/, i);
    promises.push(axios.get(pageUrl));
  };

  return Promise.all(promises)
}

function populatePlanets(planets, callBack){
  let promises = [];

  for(let i in planets){
    promises.push(fetchPopulation(planets[i]));
  }

  Promise.all(promises)
    .then(() => callBack(null))
    .catch(callBack);
}

function fetchPopulation(planet) {
  return new Promise((resolve, reject) => {
    let promises = [];

    for (let i in planet.residents) {
      promises.push(axios.get(planet.residents[i]))
    }

    Promise.all(promises).then((responses) => {
      planet.residents = responses.map(r => r.data.name); 
      resolve();
    })
    .catch(reject)

  });
}

function sortPeople(people, sortBy){
  let compareFunction;
  switch(sortBy){
    case "height":
    case "mass":
      compareFunction = (a,b) => {
        if(a[sortBy] === "unknown") return 1;
        if(b[sortBy] === "unknown") return -1;
        return a[sortBy].replace(/,/g,'') - b[sortBy].replace(/,/g,'');
      };
      break;
    case "name":
      compareFunction = (a,b) => a.name.localeCompare(b.name);
      break;
    default:
      return;
  }

  people.sort(compareFunction);
}

function sendAPIError(res){
  res.status(503).send("Trouble fetching resources from swapi.\nPlease try again in a few moments");
}