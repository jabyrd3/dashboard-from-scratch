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
      clearTimeout(registry[id].cancel);
      delete registry[id];
    },
    deleteAll: () => {
      Object
        .keys(registry)
        .forEach(t=>service.delete(t));
    },
    exec: (id) => {
      let timer = registry[id];
        timer.cb();
        timer.cancel = setTimeout(()=>{
          service.exec(id);
        }, registry[id].interval);
    }
  };
  return service;
};
