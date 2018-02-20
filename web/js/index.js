
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
      this.stopIt();
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
      this.items = result.items;
      this.nextPageToken = result.nextPageToken;
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
this.isLoadingMore = false;

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
  return ajaxPut("https://support.lsdsoftware.com/diepkhuc-mp3/voice-search?sampleRate=16000&lang=vi-VI&maxResults=10", new Blob([output]))
    .then(JSON.parse)
}

this.loadMore = function() {
  var self = this;
  if (this.isLoadingMore) return;
  this.isLoadingMore = true;
  return ajaxGet("https://support.lsdsoftware.com/diepkhuc-mp3/next-search-results?query=" + encodeURIComponent(this.query) + "&maxResults=25&pageToken=" + encodeURIComponent(this.nextPageToken))
    .then(JSON.parse)
    .then(function(result) {
      self.isLoadingMore = false;
      self.items.push.apply(self.items, result.items);
      self.nextPageToken = result.nextPageToken;
    })
}

this.isExactMatch = function(title, query) {
  const tokens = removeDiacritics(title).toUpperCase().split(/\s+/);
  return removeDiacritics(query).toUpperCase().split(/\s+/)
    .every(function(token) {
      return tokens.indexOf(token) != -1;
    })
}

this.playIt = function() {
  if (this.playbackItem != this.activeItem) {
    this.playbackItem = this.activeItem;
    this.audio.src = "https://support2.lsdsoftware.com/diepkhuc-mp3/download/" + this.activeItem.id + "/file" + (iOS ? ".m3u8" : ".m4a");
    this.playbackState = 'LOADING';
  }
  this.audio.play();
}

this.pauseIt = function() {
  this.audio.pause();
}

this.stopIt = function() {
  this.playbackItem = null;
  this.audio.src = "";
  this.audio.load();
}

this.downloadIt = function() {
  location.href = "https://support2.lsdsoftware.com/diepkhuc-mp3/download/" + this.activeItem.id + "/" + encodeURIComponent(this.activeItem.title) + ".m4a?attachment";
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
