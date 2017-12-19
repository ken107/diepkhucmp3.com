
var searchClient = new function() {
  var states = {
    IDLE: {
      onStartRecording: function() {
        this.state = states.ACQUIRING;
        getMicrophone().then(handleEvent.bind(this, "onMicrophone"));
      }
    },
    ACQUIRING: {
      onMicrophone: function(microphone) {
        this.state = states.RECORDING;
        this.microphone = microphone;
        this.capture = startCapture(microphone);
      },
      onStopRecording: function() {
        //TODO
      }
    },
    RECORDING: {
      onStopRecording: function() {
        this.state = states.SEARCHING;
        this.microphone.getTracks().forEach(callMethod("stop"));
        var audioChunks = this.capture.finish();
        voiceSearch(audioChunks).then(handleEvent.bind(this, "onSearchResult"));
      }
    },
    SEARCHING: {
      onSearchResult: function(result) {
        this.state = states.IDLE;
        this.result = result;
      },
      onStartRecording: function() {
        //TODO
      }
    }
  };

  this.state = "IDLE";
  this.startRecording = handleEvent.bind(this, "onStartRecording");
  this.stopRecording = handleEvent.bind(this, "onStopRecording");

  function handleEvent(name) {
    var handler = states[this.state][name];
    if (handler) return handler.apply(this, Array.prototype.slice.call(arguments, 1));
    else throw new Error("Unexpected event " + name + " in state " + this.state);
  }

  function voiceSearch(audioChunks) {
    var output = normalizeToS16(downSample(audioChunks, 3));
    return ajaxPut("https://support.lsdsoftware.com/diepkhuc-mp3/voice-search", new Blob([output]))
  }
}
