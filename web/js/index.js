
currentPage = "SEARCH";

searchClient = new function() {
  var states = {
    IDLE: {
      onStartRecording: function() {
        this.state = "ACQUIRING";
        console.log(this.state);
        getMicrophone().then(handleEvent.bind(this, "onMicrophone"));
      }
    },
    ACQUIRING: {
      onMicrophone: function(microphone) {
        this.state = "RECORDING";
        console.log(this.state);
        this.microphone = microphone;
        this.capture = startCapture(microphone);
      },
      onStopRecording: function() {
        this.state = "ACQUIRING_CANCELED";
        console.log(this.state);
      }
    },
    ACQUIRING_CANCELED: {
      onMicrophone: function(microphone) {
        microphone.getTracks().forEach(callMethod("stop"));
        this.state = "IDLE";
        console.log(this.state);
      }
    },
    RECORDING: {
      onStopRecording: function() {
        this.microphone.getTracks().forEach(callMethod("stop"));
        var audioChunks = this.capture.finish();
        if (audioChunks.length) {
          this.state = "SEARCHING";
          console.log(this.state);
          voiceSearch(audioChunks).then(handleEvent.bind(this, "onSearchResult"));
        }
        else {
          this.state = "IDLE";
          console.log(this.state);
        }
      }
    },
    SEARCHING: {
      onSearchResult: function(result) {
        this.state = "RESULT";
        console.log(this.state);
        this.result = result;
      },
      onStartRecording: function() {
        //TODO
      }
    }
  };
  states.RESULT = states.IDLE;

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
      .then(JSON.parse)
  }
}

var primaryInterface = {
  is: function(x) {
    return this.value == x;
  },
  setOnce: function(x) {
    if (!this.value) this.value = x;
  }
}
