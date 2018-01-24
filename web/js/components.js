
$("<div/>").load("components.html", function() {
  $(this).children().each(function() {
    var className = $(this).data("class");
    if (window[className]) dataBinder.views[className] = {template: this, controller: window[className]};
    else throw new Error("Class not found " + className);
  })
})


function NavBar() {
}


function SearchPage(viewRoot) {
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
        this.query = result.query;
        this.items = result.results;
        if (this.query && this.items.length && isExactMatch(this.items[0].title, this.query)) {
          $(viewRoot).triggerHandler('select', this.items[0]);
        }
      },
      onStartRecording: function() {
        //TODO
      }
    }
  };

  states.RESULT = states.IDLE;
  this.state = "IDLE";
  this.query = null;
  this.items = null;

  this.startRecording = function(event) {
    if (!this.primaryInterface) this.primaryInterface = event.type;
    if (event.type == this.primaryInterface) {
      handleEvent.call(this, "onStartRecording");
      if (event.type == "mousedown") $("body").one("mouseup", handleEvent.bind(this, "onStopRecording"));
      if (event.type == "touchstart") $("body").one("touchend", handleEvent.bind(this, "onStopRecording"));
    }
  }

  this.printStateTransition = function(state) {
    var time = new Date().getTime() %1000000 /1000;
    console.log(time.toFixed(1), state);
  }

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

  function isExactMatch(title, query) {
    const tokens = title.toUpperCase().split(/\W+/);
    return query.toUpperCase().split(/\W+/)
      .every(function(token) {
        return tokens.indexOf(token) != -1;
      })
  }
}


function PlaylistPage() {
}
