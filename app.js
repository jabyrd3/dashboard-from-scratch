'use strict';

/* globals CanvasDad, networkDad, TimerDad */

const app = () => {
  const colorOptions = ['Red', 'Green', 'Blue', 'White'];
  const colorHex = {
    bg: '#1B1F24',
    histoAxis: '#eff1f5',
    red: '#A00D00',
    blue: '#064987',
    green: '#007F26',
    white: '#eff1f5'
  };
  const config = {
    // url
    root: 'http://localhost:9091',
    csv: '/history.csv',
    json: '/data.json',
    // ms
    csvInterval: 1200000,
    jsonInterval: 5000,
    // 13 digit js date shit, sorry its weird
    now: Date.now(),
    oldest: 28800000
  };
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
    let x = leftBound + horizUnit * idx;
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
      let barHeight = (canvas.clientHeight / 3) / barTotal;
      // xy xy int int: top-left, bottom-right, highestval, lowestVal
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
      context.fillStyle = colorHex.bg;
      context.fillRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight);
      let idx = 0;
      let emergency = document.getElementById('emergency');
      json.green && json.green
        .filter(v=>v.TriageStatus==='White').length === 0 &&
        emergency &&
        document.body.removeChild(emergency);
      Object.keys(json)
        .forEach(key => {
          json[key]
            .map(item => {
              context.fillStyle = colorHex[key];
              let barWidth = canvas.clientWidth * (
                  (config.now - new Date(item['$116']).getTime()) / config.oldest);
              context.fillRect(
                canvas.clientWidth - barWidth,
                barHeight * idx * 1.5 + (canvas.clientHeight / 50),
                barWidth,
                barHeight);
              idx++;
              if (item.TriageStatus === 'White' && !emergency){
                emergency = document.createElement('div');
                emergency.id = 'emergency';
                document.body.appendChild(emergency);
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
      context.strokeStyle = colorHex.white;
      context.lineWidth = canvas.clientHeight / 700;
      context.stroke();
      context.beginPath();
      context.moveTo(bezierBounds[0], bezierBounds[3]);
      context.lineTo(bezierBounds[2], bezierBounds[3]);
      context.strokeStyle = colorHex.histoAxis;
      context.lineWidth = canvas.clientHeight / 1600;
      context.stroke();
      // render count of json array
      let fontsize = parseInt(canvas.clientWidth / 5, 10);
      context.font =
        `${fontsize}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      context.fillStyle = colorHex.white;
      context.fillText(barTotal.toString(),
        canvas.clientWidth * .75,
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
          json = JSON
            .parse(val.response)
            .filter(item => colorOptions.indexOf(item.TriageStatus > -1))
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
