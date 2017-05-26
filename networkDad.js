'use strict';

window.networkDad = function (target) {
  var deferred = new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `${target}`, true);
    xhr.send(null);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve({
          status: xhr.status,
          response: xhr.response
        });
      } else if (xhr.readyState === 4 && (xhr.status === 500 || xhr
          .status === 404)) {
        reject(xhr.status);
      }
    };
  });
  return deferred;
};
