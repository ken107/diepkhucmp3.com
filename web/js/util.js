
var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
var diacriticMap = createDiacriticMap();


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

function createDiacriticMap() {
  var diacritics = {
    "\u0061": "\u00e1\u00e0\u1ea3\u00e3\u1ea1\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u0103\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7",
    "\u0065": "\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7",
    "\u0069": "\u00ed\u00ec\u1ec9\u0129\u1ecb",
    "\u006f": "\u00f3\u00f2\u1ecf\u00f5\u1ecd\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3",
    "\u0075": "\u00fa\u00f9\u1ee7\u0169\u1ee5\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1",
    "\u0079": "\u00fd\u1ef3\u1ef7\u1ef9\u1ef5",
    "\u0041": "\u00c1\u00c0\u1ea2\u00c3\u1ea0\u00c2\u1ea4\u1ea6\u1ea8\u1eaa\u1eac\u0102\u1eae\u1eb0\u1eb2\u1eb4\u1eb6",
    "\u0045": "\u00c9\u00c8\u1eba\u1ebc\u1eb8\u00ca\u1ebe\u1ec0\u1ec2\u1ec4\u1ec6",
    "\u0049": "\u00cd\u00cc\u1ec8\u0128\u1eca",
    "\u004f": "\u00d3\u00d2\u1ece\u00d5\u1ecc\u00d4\u1ed0\u1ed2\u1ed4\u1ed6\u1ed8\u01a0\u1eda\u1edc\u1ede\u1ee0\u1ee2",
    "\u0055": "\u00da\u00d9\u1ee6\u0168\u1ee4\u01af\u1ee8\u1eea\u1eec\u1eee\u1ef0",
    "\u0059": "\u00dd\u1ef2\u1ef6\u1ef8\u1ef4",
    "\u0064": "\u0111",
    "\u0044": "\u0110"
  };
  var map = {};
  for (var base in diacritics) {
    var chars = diacritics[base];
    for (var i=0; i<chars.length; i++) map[chars[i]] = base;
  }
  return map;
}

function removeDiacritics(text) {
  text = text.replace(/[\u0300-\u036f]/g, '');
  var chars = new Array(text.length);
  for (var i=0; i<text.length; i++) {
    var char = text.charAt(i);
    chars[i] = diacriticMap[char] || char;
  }
  return chars.join("");
}
