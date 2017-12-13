
window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function getUserMedia(options) {
  return new Promise(function(fulfill, reject) {
    navigator.getUserMedia(options, fulfill, reject);
  })
}

function ajaxPut(sUrl, oData) {
  return new Promise(function(fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", sUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(xhr.responseText);
        else reject(new Error(xhr.responseText));
      }
    };
    xhr.send(oData);
  })
}

function downSample(chunks, period) {
  var totalLen = chunks.reduce(function(sum, chunk) {return sum+chunk.length}, 0);
  var output = new Float32Array(Math.ceil(totalLen/period));
  var o = 0;
  chunks.reduce(function(startIndex, chunk) {
    var i;
    for (i=startIndex; i<chunk.length; i+=period) output[o++] = chunk[i];
    return i-chunk.length;
  }, 0)
  return output;
}

function normalizeToS16(f32Array) {
  var peak = 0;
  for (var i=0; i<f32Array.length; i++) {
    var sample = f32Array[i];
    if (sample > peak) peak = sample;
    else if (sample < -peak) peak = -sample;
  }
  var scaleFactor = 0x7fff / peak;
  var s16Array = new Int16Array(f32Array.length);
  for (var i=0; i<f32Array.length; i++) {
    s16Array[i] = f32Array[i] * scaleFactor;
  }
  return s16Array;
}
