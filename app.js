'use strict';

/* globals CanvasDad, networkDad, TimerDad, config, initDad */

const app = () => {
  initDad();
  const colorOptions = ['Red', 'Green', 'Blue', 'White'];
  const canvasDad = new CanvasDad();
  const timerDad = new TimerDad();
  // update this to not be static when pushed to prod
  let csv = [];
  let json = [];
  let coords = (bzb, line, next, idx, length) => {
    // this generates x/y and control point x/y coordinates
    // offset by the amount needed for the layout (determined
    // by the bezierBounds array set in the canvasdad render
    // functions
    //       0  1  2  3  4  5
    // bzb: [x, y, x, y, h, l]
    // line: [timestamp, val]
    // next: [timestamp, val]
    // idx: int
    // length: int, overall points count
    let lowest = 0;
    let [leftBound, topBound, rightBound, bottomBound, highest] =
      bzb;
    let vertUnit = (bottomBound - topBound) / (highest - lowest);
    let horizUnit = (rightBound - leftBound) / length+1;
    let x = leftBound + horizUnit * idx + 10;
    let y = topBound + ((highest - line[1]) * vertUnit);
    let [nx, ny] = next ?
      [(x + leftBound + horizUnit * (idx + 1))/2,
       (y + (topBound + ((highest - next[1]) * vertUnit)))/2] :
      [x,y];
    return [x, y, nx, ny];
  };

  const canvasId = canvasDad
    .create(document.getElementById('app'), (canvas, context) => {
      let barTotal = Object
        .keys(json)
        .reduce((acc, key) => acc + json[key].length, 0);
      let barHeight = (canvas.clientHeight / 3) / (barTotal*1.5);
      barHeight = barHeight > canvas.clientHeight / 20 ?
        canvas.clientHeight / 20 :
        barHeight;
      // xy xy int int: top-left, bottom-right, highstval, lowestVal
      let bezierBounds = [
        0,
        canvas.clientHeight * .6,
        canvas.clientWidth * .7,
        canvas.clientHeight - 40,
        // get highest and lowest vals in csv for measuring
        ...csv
          .slice()
          .sort((a,b) => b[1] - a[1])
          .filter((v, idx) => idx === 0 || idx+1 === csv.length)
          .map(v => parseInt(v[1], 10))
      ];
      context.fillStyle = config.colorHex.bg;
      context.fillRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight);
      let idx = 0;
      let UNTRIAGED = document.getElementById('UNTRIAGED');
      json.green && json.green
        .filter(v=>v.TriageStatus==='White').length === 0 &&
        UNTRIAGED &&
        (()=>{
          document.body.className = '';
          return true;
        })() && document.body.removeChild(UNTRIAGED);
      let msUnit = canvas.clientWidth / config.oldest;
      Object.keys(json)
        .forEach(key => {
          json[key]
            .map(item => {
              context.fillStyle = config.colorHex[key];
              let diff = config.now - new Date(item['$116']).getTime();
              let barWidth = diff > config.oldest ?
                msUnit * config.oldest :
                msUnit * diff;
              barWidth < canvas.clientWidth / 50 &&
                (() => barWidth = canvas.clientWidth / 50)();
              context.fillRect(
                canvas.clientWidth - barWidth,
                barHeight * idx * 1.5 + (canvas.clientHeight / 50),
                barWidth,
                barHeight);
              idx++;
              if (item.TriageStatus === 'White' && !UNTRIAGED){
                UNTRIAGED = document.createElement('div');
                UNTRIAGED.id = 'UNTRIAGED';
                UNTRIAGED.className =
                  window.location.search.indexOf('rainbow') > -1 ?
                  'spins' :
                  'stationary';
                document.body.appendChild(UNTRIAGED);
              }
          });
      });
      // render graph
      context.beginPath();
      csv.forEach((l, idx) => {
        idx === 0 ? context.moveTo(...coords(bezierBounds, l, csv[idx+1], idx, csv.length)) : context
          .quadraticCurveTo(
              ...coords(bezierBounds, l, csv[idx+1], idx, csv.length));
      });
      context.strokeStyle = config.colorHex.white;
      context.lineWidth = canvas.clientHeight / config.lineWidthDivisor;
      context.lineCap = 'round';
      context.stroke();
      context.beginPath();
      context.moveTo(bezierBounds[0], bezierBounds[3]);
      context.lineTo(bezierBounds[2], bezierBounds[3]);
      context.strokeStyle = config.colorHex.histoAxis;
      context.lineWidth = canvas.clientHeight / (config.lineWidthDivisor * 8);
      context.stroke();

      // render 'oldest' as text below baseline
      let fontSize = parseInt(canvas.clientHeight / 50, 10);
      context.font =
        `100 ${fontSize}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      context.fillStyle = config.colorHex.white;
      context.fillText(`Last ${config.oldest/1000/60/60} hours`,
        (bezierBounds[2] - bezierBounds[0]) / 2 - canvas.clientWidth/25,
        bezierBounds[3] + canvas.clientHeight / 40);

      // render count of json array
      fontSize = parseInt(canvas.clientWidth / 5, 10);
      context.font =
        `${fontSize}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      context.fillStyle = config.colorHex.white;
      context.textAlign = 'right';
      context.fillText(barTotal.toString(),
        canvas.clientWidth,
        canvas.clientHeight * .85);
    }).identifier;

  // shows error div, sets text with some info about what failed
  const triggerWarning = (active, type, err) => {
    let elem = document.getElementById('error');
    if (active){
      elem.innerText = `GET request failed for ${type}, error code ${err}`;
      return elem.className = 'show';
    }
    elem.innerText = '';
    return elem.className = 'hide';
  };

  // instantiate cvs poller
  const csvPoller = () => {
    return timerDad.create(() => {
      networkDad(`${config.root}${config.csv}`)
        .then(val => {
          // reset config.now
          config.now = Date.now();
          // split on lines, returns array like [date, sumValue]
          // also filters out items that are too old, not sure if thats right.
          csv = val.response
            .split('\n')
            .map(line => line.split(','))
            .filter(line => line.length > 1)
            .map(line => [
              new Date(line[0]).getTime(),
              parseInt(line[1], 10) + parseInt(line[2], 10)
            ])
            // config now is 13 digit timestamp from config object,
            // line[0] is 13 digit timestamp from previous map
            // config.oldest is magic number for 8 hours from config
            .filter(line => config.now - line[0] < config.oldest);
          triggerWarning(false);
          canvasDad.update(canvasId);
        })
        .catch(err => triggerWarning(true, 'csv', err));
      }, config.csvInterval);
  };

  // instantiate json poller
  const jsonPoller = () => {
    return timerDad.create(() => {
      networkDad(`${config.root}${config.json}`)
        .then(val => {
          // filters items that aren't white, red, green, or blue
          // sorts based on time order
          // splits them into object like: {red: [], blue:[]...}
          // calls render function for canvas
          // clears triggerWarning
          // reset config.now
          config.now = Date.now();
          json = JSON
            .parse(val.response)
            .filter(item => colorOptions.indexOf(item.TriageStatus) > -1)
            .sort((a, b) => new Date(a['$116'])
              .getTime() - new Date(b['$116']).getTime())
            .reduce(
              (acc, item) => {
                item.TriageStatus !== 'White' ?
                  acc[item.TriageStatus.toLowerCase()].push(item) :
                  acc.green.push(item);
                return acc;
              },
              {red: [], green: [], blue: []});
          canvasDad.update(canvasId);
          triggerWarning(false);
        })
        .catch(err => triggerWarning(true, 'json', err));
    }, config.jsonInterval);
  };

  // keep track of poller ids
  let timerIds = [csvPoller(), jsonPoller()];

  // refresh
  window.onclick = () => {
    triggerWarning(false);
    timerDad.deleteAll();
    timerIds = [csvPoller(), jsonPoller()];
  };
};

window.onload = app;
