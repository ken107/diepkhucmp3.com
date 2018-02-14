
var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function getMicrophone() {
  return navigator.mediaDevices.getUserMedia({
    "audio": true,
    "video": false
  })
}

function closeMicrophone(mic) {
  mic.getTracks().forEach(callMethod("stop"));
}

/**
 * Must be called on user action for iOS to work
 */
function AudioCapture() {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var context = new AudioContext();
  var source;
  var capture = context.createScriptProcessor(8192, 1, 1);
  var chunks = [];
  capture.onaudioprocess = function(event) {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  capture.connect(context.destination);
  context.resume();

  this.start = function(microphone) {
    assert(!source);
    source = context.createMediaStreamSource(microphone);
    source.connect(capture);
  };

  this.finish = function() {
    source.disconnect();
    source = null;
    var result = chunks;
    chunks = [];
    return result;
  };
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

function callMethod(name, args) {
  return function(obj) {
    return obj[name].apply(obj, args);
  };
}

function assert(truth) {
  if (!truth) {
    var err = new Error("Assertion failed");
    alert(err.stack);
    throw err;
  }
}
