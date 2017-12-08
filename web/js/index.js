
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
  .then(function(stream) {
    var audioContext = new AudioContext();
    var source = audioContext.createMediaStreamSource(stream);
    var capture = audioContext.createScriptProcessor(16384, 1, 0);
    var chunks = [];
    capture.onaudioprocess = function(event) {
      chunks.push(event.inputBuffer.getChannelData(0));
    }
    source.connect(capture);
    capture.connect(audioContext.destination);
    return {
      stop: function() {
        source.disconnect();
        capture.disconnect();
        return chunks;
      }
    }
  })
}
