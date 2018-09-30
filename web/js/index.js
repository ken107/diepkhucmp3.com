
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
this.feedbackDialog = {};
this.lang = "VI";

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
  var lang = this.lang == "VI" ? "vi-VI" : "en-US";
  return new Promise(function(fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://support.lsdsoftware.com:30299/diepkhuc-mp3?capabilities=voiceSearch-1.0", true);
    xhr.setRequestHeader("x-service-request-header", JSON.stringify({
      method: "voiceSearch",
      sampleRate: 16000,
      lang: lang,
      maxResults: 10
    }))
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(JSON.parse(xhr.responseText));
        else reject(new Error(xhr.responseText));
      }
    };
    xhr.send(new Blob([output]));
  })
}

this.loadMore = function() {
  var self = this;
  if (this.isLoadingMore) return;
  this.isLoadingMore = true;
  return new Promise(function(fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://support.lsdsoftware.com:30299/diepkhuc-mp3?capabilities=search-1.0", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(JSON.parse(xhr.responseText));
        else reject(new Error(xhr.responseText));
      }
    };
    xhr.send(JSON.stringify({
      method: "search",
      query: self.query,
      maxResults: 25,
      pageToken: self.nextPageToken
    }))
  })
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
    if (this.activeItem.type == 1) this.audio.src = "http://sing.datviet.com/mp3/" + this.activeItem.id + ".mp3";
    else if (this.activeItem.type == 2) this.audio.src = "https://support2.lsdsoftware.com/diepkhuc-mp3/download/" + this.activeItem.id + "/file" + (iOS ? ".m3u8" : ".m4a");
    else alert("What the hell!");
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

this.showFeedbackDialog = function() {
  this.feedbackDialog.formData = {comment: "", email: ""};
  this.feedbackDialog.visible = true;
}

this.submitFeedback = function() {
  if (!this.feedbackDialog.formData.comment) {
    this.feedbackDialog.formData.error = "Please enter a comment";
    return;
  }
  var self = this;
  $.ajax({
    method: "POST",
    url: "https://support.lsdsoftware.com:30299/lsdsoftware?capabilities=submitFeedback-1.0",
    data: JSON.stringify({
      method: "submitFeedback",
      subject: "DiepKhuc MP3",
      message: this.feedbackDialog.formData.comment,
      email: this.feedbackDialog.formData.email
    }),
    contentType: "application/json",
    success: function() {
      self.feedbackDialog.visible = false;
    },
    error: function() {
      self.feedbackDialog.formData.error = "Failed to send feedback, please email us at admin&#64;lsdsoftware.com";
    }
  })
}

this.cancelFeedback = function() {
  this.feedbackDialog.visible = false;
}

this.toggleLang = function() {
  if (this.lang == 'VI') this.lang = 'EN';
  else this.lang = 'VI';
}
