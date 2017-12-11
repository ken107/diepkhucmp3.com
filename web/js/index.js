
recording = null;

function submit(chunks) {
  ajaxPut("http://localhost:30112/put", new Blob(chunks));
}

function record() {
  return getUserMedia({
    "audio": {
      "mandatory": {
        "googEchoCancellation": "false",
        "googAutoGainControl": "false",
        "googNoiseSuppression": "false",
        "googHighpassFilter": "false"
      },
      "optional": []
    },
  })
  .then(function(webcam) {
    var audioContext = new AudioContext();
    var source = audioContext.createMediaStreamSource(webcam);
    var capture = audioContext.createScriptProcessor(16384, 1, 1);
    var chunks = [];
    capture.onaudioprocess = function(event) {
      chunks.push(event.inputBuffer.getChannelData(0));
    }
    source.connect(capture);
    capture.connect(audioContext.destination);
    return {
      stop: function() {
        webcam.getTracks().forEach(function(track) {track.stop()});
        source.disconnect();
        capture.disconnect();
        return chunks;
      }
    }
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
