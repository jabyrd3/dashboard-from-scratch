const config = {
  // url
  root: 'http://localhost:9091',
  csv: '/history.csv',
  json: '/data.json',
  // ms
  // 20 minutes
  csvInterval: 20 * 60 * 1000,
  // 20 seconds
  jsonInterval: 20 * 1000,
  // 13 digit js date shit, sorry its weird
  now: Date.now(),
  // 8 hours
  oldest: 8 * 60 * 60 * 1000,
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
