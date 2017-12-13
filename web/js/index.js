
recording = null;

function submit(chunks) {
  console.log(chunks.length, "chunks");
  var output = normalizeToS16(downSample(chunks, 3));
  ajaxPut("http://localhost:30112/put", new Blob([output]));
  //ajaxPut("http://localhost:30112/put", new Blob(chunks));
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
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
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
