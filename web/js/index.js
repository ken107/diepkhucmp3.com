
currentPage = "SEARCH";

searchClient = new function() {
  var states = {
    IDLE: {
      onStartRecording: function() {
        this.state = "ACQUIRING";
        getMicrophone().then(handleEvent.bind(this, "onMicrophone"));
      }
    },
    ACQUIRING: {
      onMicrophone: function(microphone) {
        this.state = "RECORDING";
        this.microphone = microphone;
        this.capture = startCapture(microphone);
        this.capturingSince = new Date().getTime();
      },
      onStopRecording: function() {
        this.state = "ACQUIRING_CANCELED";
      }
    },
    ACQUIRING_CANCELED: {
      onMicrophone: function(microphone) {
        microphone.getTracks().forEach(callMethod("stop"));
        this.state = "IDLE";
      }
    },
    RECORDING: {
      onStopRecording: function() {
        this.microphone.getTracks().forEach(callMethod("stop"));
        var elapsed = new Date().getTime() - this.capturingSince;
        if (elapsed > 500) {
          this.state = "RECORDING_STOPPING";
          setTimeout(handleEvent.bind(this, "onRecordingStopped"), 500);
        }
        else {
          this.capture.finish();
          this.state = "IDLE";
        }
      }
    },
    RECORDING_STOPPING: {
      onRecordingStopped: function() {
        var audioChunks = this.capture.finish();
        this.state = "SEARCHING";
        voiceSearch(audioChunks).then(handleEvent.bind(this, "onSearchResult"));
      }
    },
    SEARCHING: {
      onSearchResult: function(result) {
        this.state = "RESULT";
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

playlist = new function() {
  this.items = [];

  this.add = function(item) {
    this.items.push(item);
  }
}


var primaryInterface;

function startRecording(event) {
  if (!primaryInterface) primaryInterface = event.type;
  if (event.type == primaryInterface) {
    searchClient.startRecording();
    if (event.type == "mousedown") $("body").one("mouseup", searchClient.stopRecording.bind(searchClient));
    if (event.type == "touchstart") $("body").one("touchend", searchClient.stopRecording.bind(searchClient));
  }
}

function printStateTransition(state) {
  var time = new Date().getTime() %1000000 /1000;
  console.log(time.toFixed(1), state);
}
