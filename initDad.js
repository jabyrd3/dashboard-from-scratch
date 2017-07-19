window.initDad = function () {
  console.log('init');
  document.onclick = function(){
    var doc = document.documentElement;
    return (doc.requestFullscreen && doc.requestFullscreen()) ||
      (doc.mozRequestFullScreen && doc.mozRequestFullScreen()) ||
      (doc.webkitRequestFullScreen &&
        doc.webkitRequestFullScreen(doc.ALLOW_KEYBOARD_INPUT));
  };
};
