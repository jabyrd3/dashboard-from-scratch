/* globals NoSleep */
window.initDad = function () {
  console.log('init');
  var noSleep = new NoSleep();
  document.onclick = function(){
    noSleep.enable();
    var doc = document.documentElement;
    return (doc.requestFullscreen && doc.requestFullscreen()) ||
      (doc.mozRequestFullScreen && doc.mozRequestFullScreen()) ||
      (doc.webkitRequestFullScreen &&
        doc.webkitRequestFullScreen(doc.ALLOW_KEYBOARD_INPUT));
  };
};
