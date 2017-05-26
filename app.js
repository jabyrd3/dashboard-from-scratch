'use strict';

/* globals CanvasDad, networkDad, TimerDad */

const app = () => {
  const colorOptions = ['Red', 'Green', 'Blue'];
  const colorHex = {
    bg: '#1B1F24',
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
    jsonInterval: 20000,
    now: new Date('2017-05-22T16:43:02Z').getTime(),
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
    //
    // bzb: [x, y, x, y, h, l]
    // line: [timestamp, val]
    // next: [timestamp, val]
    // idx: int
    // length: int, overall points count

    let x = bzb[0] + (((bzb[2]-bzb[0]) / length) * idx);
    let y = bzb[1] + ((bzb[3] - bzb[1]) / (bzb[4] - bzb[5]) * line[1]);
    let [nx, ny] = next ?
      [(x + bzb[0] + (((bzb[2]-bzb[0]) / length) * (idx + 1)))/2,
       (y + bzb[1] + ((bzb[3] - bzb[1]) / (bzb[4] - bzb[5]) * next[1]))/2] :
      [x,y];
    return [x, y, nx, ny];
  };

  const canvasId = canvasDad
    .create(document.getElementById('app'), (canvas, context) => {
      let barTotal = Object
        .keys(json)
        .reduce((acc, list) => acc + list.length, 0);
      let barHeight = (canvas.clientHeight / 3) / barTotal;
      // xy xy int int: top-left, bottom-right, highestval, lowestVal
      let bezierBounds = [
        0,
        canvas.clientHeight * .5,
        canvas.clientWidth * .75,
        canvas.clientHeight - 150,
        // get highest and lowest vals in csv for measuring
        ...csv
          .slice()
          .sort((a,b) => a[1] > b[1])
          .reverse()
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
      Object.keys(json).forEach(key => {
        json[key].map((item) => {
          context.fillStyle = colorHex[item.TriageStatus.toLowerCase()];
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
      context.moveTo(bezierBounds[0], bezierBounds[1]);
      csv.map((l, idx) => {
        context
          .quadraticCurveTo(
              ...coords(bezierBounds, l, csv[idx+1], idx, csv.length));
      });
      context.strokeStyle = colorHex.white;
      context.lineWidth = canvas.clientHeight / 700;
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
          csv = val.response
            .split('\n')
            .map(line => line.split(','))
            .map(line => [
              new Date(line[0]).getTime(),
              parseInt(line[1], 10) + parseInt(line[2], 10)
            ])
            .filter(line => config.now - line[0] > config.oldest);
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
          json = JSON
            .parse(val.response)
            .filter(item => colorOptions.indexOf(item.TriageStatus > -1))
            .sort((a, b) => new Date(a['$116'])
              .getTime() > new Date(b['$116']).getTime())
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
    timerIds.forEach(i=>timerDad.delete(i));
    timerIds = [csvPoller(), jsonPoller()];
  };
};

window.onload = app;