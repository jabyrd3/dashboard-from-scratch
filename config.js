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
  oldest: 28800000,
  lineWidthDivisor: 200,
  colorHex: {
    bg: '#1B1F24',
    histoAxis: '#eff1f5',
    red: '#A00D00',
    blue: '#064987',
    green: '#007F26',
    white: '#eff1f5'
  }
};

window.config = config;