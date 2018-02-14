
var states = {
  STARTUP: {
    onApprove: function() {
      this.audioCapture = new AudioCapture();
      this.audio.src = "sounds/silence.mp3";
      this.audio.play();
      getMicrophone()
        .then(function(mic) {
          if (mic) {
            closeMicrophone(mic);
            this.state = "IDLE";
          }
          else console.error("Rejected");
        })
        .catch(console.error)
    }
  },
  IDLE: {
    onStartRecording: function() {
      this.state = "ACQUIRING";
      getMicrophone().then(this.handleEvent.bind(this, "onMicrophone"));
    }
  },
  ACQUIRING: {
    onMicrophone: function(microphone) {
      this.state = "RECORDING";
      this.microphone = microphone;
      this.audioCapture.start(microphone);
      this.capturingSince = new Date().getTime();
    },
    onStopRecording: function() {
      this.state = "ACQUIRING_CANCELED";
    }
  },
  ACQUIRING_CANCELED: {
    onMicrophone: function(microphone) {
      closeMicrophone(microphone);
      this.state = "IDLE";
    }
  },
  RECORDING: {
    onStopRecording: function() {
      this.microphone.getTracks().forEach(callMethod("stop"));
      var elapsed = new Date().getTime() - this.capturingSince;
      if (elapsed > 500) {
        this.state = "RECORDING_STOPPING";
        setTimeout(this.handleEvent.bind(this, "onRecordingStopped"), 500);
      }
      else {
        this.audioCapture.finish();
        this.state = "IDLE";
      }
    }
  },
  RECORDING_STOPPING: {
    onRecordingStopped: function() {
      var audioChunks = this.audioCapture.finish();
      this.state = "SEARCHING";
      this.voiceSearch(audioChunks).then(this.handleEvent.bind(this, "onSearchResult"));
    }
  },
  SEARCHING: {
    onSearchResult: function(result) {
      this.state = "RESULT";
      this.query = result.query;
      this.items = result.query ? result.results : [];
      if (this.query && this.items.length && this.isExactMatch(this.items[0].title, this.query)) {
        this.activeItem = this.items[0];
        this.playIt();
      }
    },
    onStartRecording: function() {
      //TODO
    }
  }
};

states.RESULT = states.IDLE;

this.state = "STARTUP";
this.query = null;
this.items = null;
this.activeItem = null;
this.playbackItem = null;
this.playbackState = 'STOPPED';
this.playbackTime = null;
this.audio = document.createElement('AUDIO');
this.audio.onplaying = (function() {this.playbackState = 'PLAYING'}).bind(this);
this.audio.onpause = (function() {this.playbackState = 'STOPPED'}).bind(this);
this.audio.ontimeupdate = (function() {this.playbackTime = Math.round(this.audio.currentTime)}).bind(this);

this.startRecording = function(event) {
  if (!this.primaryInterface) this.primaryInterface = event.type;
  if (event.type == this.primaryInterface) {
    this.handleEvent("onStartRecording");
    if (event.type == "mousedown") $("body").one("mouseup", this.handleEvent.bind(this, "onStopRecording"));
    if (event.type == "touchstart") $("body").one("touchend", this.handleEvent.bind(this, "onStopRecording"));
  }
}

this.printStateTransition = function(state) {
  var time = new Date().getTime() %1000000 /1000;
  console.log(time.toFixed(1), state);
}

this.handleEvent = function(name) {
  var handler = states[this.state][name];
  if (handler) return handler.apply(this, Array.prototype.slice.call(arguments, 1));
  else throw new Error("Unexpected event " + name + " in state " + this.state);
}

this.voiceSearch = function(audioChunks) {
  var output = normalizeToS16(downSample(audioChunks, 3));
  return ajaxPut("https://support.lsdsoftware.com/diepkhuc-mp3/voice-search", new Blob([output]))
    .then(JSON.parse)
}

this.isExactMatch = function(title, query) {
  const tokens = title.toUpperCase().split(/\W+/);
  return query.toUpperCase().split(/\W+/)
    .every(function(token) {
      return tokens.indexOf(token) != -1;
    })
}

this.playIt = function() {
  if (this.playbackItem != this.activeItem) {
    this.playbackItem = this.activeItem;
    this.audio.src = this.getDownloadUrl(this.activeItem);
    this.playbackState = 'LOADING';
  }
  this.audio.play();
}

this.pauseIt = function() {
  this.audio.pause();
}

this.downloadIt = function() {
  location.href = this.getDownloadUrl(this.activeItem);
}

this.getDownloadUrl = function(item) {
  var ext = iOS ? ".aac" : ".m4a";
  return "https://support2.lsdsoftware.com/diepkhuc-mp3/download/" + item.id + "/" + encodeURIComponent(item.title) + ext;
}

this.printPlaybackTime = function(time) {
  if (!time || time == Infinity) return '00:00';
  time = Math.round(time);
  var min = Math.floor(time / 60);
  var sec = time % 60;
  if (min < 10) min = '0' + min;
  if (sec < 10) sec = '0' + sec;
  return min + ':' + sec;
}

window.oncontextmenu = function(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
};
