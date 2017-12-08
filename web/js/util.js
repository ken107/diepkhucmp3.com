
window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function getUserMedia(options) {
  return new Promise(function(fulfill, reject) {
    navigator.getUserMedia(options, fulfill, reject);
  })
}
