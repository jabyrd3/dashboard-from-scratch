'use strict';

window.TimerDad = function () {
  let registry = {};
  let service = {
    create: (cb, interval) => {
      let id = Object.keys(registry).length;
      registry[id] = {cb, interval, pause: false};
      service.exec(id);
      return id;
    },
    delete: (id) => {
      clearTimeout(registry[id].timer);
      delete registry[id];
    },
    exec: (id) => {
      let timer = registry[id];
        timer.cb();
        setTimeout(()=>{
          service.exec(id);
        }, registry[id].interval);
    }
  };
  return service;
};
