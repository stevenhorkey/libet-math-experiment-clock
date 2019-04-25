var labclock = {
  //State definition consts
  STATE_PRE: 0,
  STATE_PASSWORD: 1,
  STATE_PHASE_START: 2,
  STATE_TRIAL_READY: 3,
  STATE_TRIAL_RUNNING: 4,
  STATE_TRIAL_SELECTING: 5,
  STATE_PHASE_END: 6,
  STATE_POST: 7,
  //Selectors
  head: document.getElementsByTagName('head')[0],
  body: document.getElementsByTagName('body')[0],
  bodyStyle: document.getElementsByTagName('body')[0].style,
  experimentElement: document.createElement('script'),
  preScreen: document.getElementById('pre_screen'),
  preScreenTitle: document.getElementById('pre_screen_title'),
  preScreenContent: document.getElementById('pre_screen_content'),
  expScreen: document.getElementById('exp_screen'),
  expScreenTitle: document.getElementById('exp_screen_title'),
  expScreenProgress: document.getElementById('exp_screen_progress'),
  expScreenCaption: document.getElementById('exp_screen_caption'),
  expScreenTextbox: document.getElementById('exp_screen_textbox'),
  expScreenTextboxValue: document.getElementById('exp_screen_textbox_value'),
  expScreenContent: document.getElementById('exp_screen_content'),
  expScreenClock: document.getElementById('exp_screen_clock'),
  clock: document.getElementById('clock'),
  dot: document.getElementById('dot'),
  postScreen: document.getElementById('post_screen'),
  postScreenTitle: document.getElementById('post_screen_title'),
  postScreenContent: document.getElementById('post_screen_content'),
  buttonPreviousElement: document.getElementById('a_previous'),
  buttonOKElement: document.getElementById('a_ok'),
  buttonNextElement: document.getElementById('a_next'),
  buttonPrevious: document.getElementById('button_previous'),
  buttonOK: document.getElementById('button_ok'),
  buttonNext: document.getElementById('button_next'),
  captionPrevious: document.getElementById('caption_previous'),
  captionOK: document.getElementById('caption_ok'),
  captionNext: document.getElementById('caption_next'),
  //Properties
  experiment: null,
  audioContext: null,
  audioGetReadyElements: [],
  audioFeedbackBuffers: [],
  audioFeedbackBuffersData: [],
  audioFeedbackNodes: [],
  state: undefined,
  preScreensIndex: 0,
  phasesIndex: 0,
  trialsIndex: 0,
  postScreensIndex: 0,
  trialCurrentLap: 1,
  trialLapPressed: 1,
  clockRadius: 225,
  //Methods
  initAudio: function () {
    try {
      this.audioContext = new AudioContext();
      this.audioGetReadyElements[0] = document.createElement('audio');
      this.audioGetReadyElements[0].src = this.experiment.sounds.demo[0].file;
      this.audioGetReadyElements[0].preload = 'auto';
      this.setAudioListeners(0);

      for (var i = 1; i <  this.experiment.sounds.getReady.length; i++) {
        this.audioGetReadyElements[i] = document.createElement('audio');
        this.audioGetReadyElements[i].src = this.experiment.sounds.getReady[i].file;
        this.audioGetReadyElements[i].preload = 'auto';
        this.setAudioListeners(i);
      }
    } catch (e) {
      this.preScreenContent.innerHTML = '<p><strong>ERROR:</strong> ' + this.experiment.messages.errorAudio + '</p><br/><p>' + this.experiment.messages.recommendBrowser + '</p>';
      this.showButtons(false, false, false);
    }
  },
  fisherYates: function (arr) {
    var i = arr.length,
        j,
        tempi,
        tempj;
    if (i == 0) return false;
    while (--i) {
      j = Math.floor(Math.random() * (i + 1));
      tempi = arr[i];
      tempj = arr[j];
      arr[i] = tempj;
      arr[j] = tempi;
    }
  },
  showButtons: function (p, o, n) {
    // takes boolean values and determines which buttons should show on the screen.
    var displayPrevious = p ? 'block' : 'none',
        displayOK = o ? 'block' : 'none',
        displayNext = n ? 'block' : 'none';
    this.buttonPrevious.style.display = displayPrevious;
    this.buttonOK.style.display = displayOK;
    this.buttonNext.style.display = displayNext;
    if (o && !p) {
      //TODO: center buttonOK properly
      this.buttonOK.style.marginLeft = '48%';
    }
  },
  showPreScreen: function (i) {
    // Displays pre-experiment screen with necessary buttons and text content.
    if (i > 0) {
      this.showButtons(true, false, true);
    } else {
      this.showButtons(false, false, true);
    }
    this.preScreenTitle.innerHTML = this.experiment.preScreens[i].title;
    this.preScreenContent.innerHTML = this.experiment.preScreens[i].content;
  },
  showPasswordScreen: function () {
    // Displays password screen with proper buttons and text content
    this.showButtons(false, true, false);
    this.preScreenTitle.innerHTML = this.experiment.passwordScreen.title;
    this.preScreenContent.innerHTML = this.experiment.passwordScreen.content;
  },
  startPhase: function () {
    // initiates new phase and resets the trial count to be indexed during the new phase.
    this.trialsIndex = 0;
    this.startTrial(true);
  },
  playDemo: function () {
    // Initiate audio
    this.audioGetReadyElements[0].play();
  },
  playReady: function (i) {
    // Sets program state to trial in process, and starts clock.
    i = i || 1; 
    // this.audioGetReadyElements[--i].play();
    this.state = this.STATE_TRIAL_RUNNING;
    this.startClock();
  },
  prepareFeedback: function (i) {
    var SAMPLE_RATE = 48000,
        PI_2 = Math.PI * 2,
        j = 0,
        samples = 0;
    i = i || 1;
    i--;
    samples = (this.experiment.sounds.feedback[i].duration / 1000) * SAMPLE_RATE;
    this.audioFeedbackBuffers[i] = this.audioContext.createBuffer(1, samples, SAMPLE_RATE);
    this.audioFeedbackBuffersData[i] = this.audioFeedbackBuffers[i].getChannelData(0);    
    for (j = 0; j < samples; j++) {
      this.audioFeedbackBuffersData[i][j] = Math.sin(this.experiment.sounds.feedback[i].pitch * PI_2 * j / SAMPLE_RATE);
    }
    this.audioFeedbackNodes[i] = this.audioContext.createBufferSource();
    this.audioFeedbackNodes[i].playbackRate.value = 1.0;
    this.audioFeedbackNodes[i].connect(this.audioContext.destination);
    this.audioFeedbackNodes[i].buffer = this.audioFeedbackBuffers[i];
  },
  playFeedback: function (i) {
    i = i || 1;
    i--;
    // Allows press during firstlap if trial has that property. 
    if (this.trialCurrentLap >= 0 || this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].firstlap || this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].nopress) {
      // if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].tone) {
        // if (!this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime) {

          // set 0 delay for all trials here regardless of what's in experiment. Author says this may mess with the style animation of the dot but nothing is out of order. 
          var delay = 0;
          this.audioFeedbackNodes[i].start(this.audioContext.currentTime + delay);
          this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime = (this.audioContext.currentTime - this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialAudioTime) * 1000 + this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].tone;

        // }
      // } else {
      //   this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime = 1;
      // }
    }
  },
  storeKeyPressed: function(e) {
    // Store Keypress value to be exported to data file later
    var button = e.key;
    if(button === " ") button = "spacebar";
    this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keysPressed.push(button);
    // console.log(e.key, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex])
  },
  storeKeypressTrialTime: function (t) {
    // Store keypress time to be exported to data file later.
    if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].firstlap) {
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keypressTrialTimes.push(t - this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialTime);
    } else {
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keypressTrialTimes.push(t - this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialTime - this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle);
    }
    console.log(t, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialTime, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle)
    console.log('keypress time',this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keypressTrialTimes[0])
  },
  storeStartTrialTimes: function (t) {
    // Store when a trial started to be used in storeKeypressTrialTime later
    this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialTime = t;
    this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialAudioTime = this.audioContext.currentTime;
  },
  storeEndTrialTimes: function (t, e) {
    this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].endTrialTime = e;
    this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycleTime = t;
  },
  keypressHandler: function(e) {
    var keyChar;
    if (!document.all) { //Not IE
      keyChar = e.which;
    } else { //IE
      keyChar = window.event.keyCode;
    }
    // If statement below allows for the TWO key values defined in experiment file. 
    if (keyChar === self.labclock.experiment.responseKey1.charCodeAt(0)
      || keyChar === self.labclock.experiment.responseKey2.charCodeAt(0)
    ) {
      self.labclock.playFeedback(self.labclock.experiment.phases[self.labclock.phasesIndex].trials[self.labclock.trialsIndex].feedback);
      self.labclock.storeKeyPressed(e);
      self.labclock.storeKeypressTrialTime(e.timeStamp);
      window.removeEventListener('keypress', this.keypressHandler, false);
      self.labclock.trialLapPressed = self.labclock.trialCurrentLap;
      console.log('set this.trialLapPressed',self.labclock.trialLapPressed,self.labclock.trialCurrentLap)
    }
  },
  animationStartHandler: function (e) {
    // Starts clock animation
    console.log('animation start handler')
    self.labclock.expScreenCaption.innerHTML = '';
    self.labclock.storeStartTrialTimes(e.timeStamp);
    if (self.labclock.experiment.phases[self.labclock.phasesIndex].trials[self.labclock.trialsIndex].nopress) {
      self.labclock.unsetKeyboardListener();
      self.labclock.playFeedback(self.labclock.experiment.phases[self.labclock.phasesIndex].trials[self.labclock.trialsIndex].feedback);
      self.labclock.storeKeypressTrialTime(0);
    } else {
      self.labclock.setKeyboardListener();
    }
  },
  animationIterationHandler: function (e) {
    self.labclock.trialCurrentLap++;
    console.log('incremented tiral lap', self.labclock.trialCurrentLap)
    if (self.labclock.experiment.phases[self.labclock.phasesIndex].trials[self.labclock.trialsIndex].stop && self.labclock.experiment.phases[self.labclock.phasesIndex].trials[self.labclock.trialsIndex].toneTime) {
      self.labclock.dot.style.webkitAnimation = 'none';
      self.labclock.dot.style.mozAnimation = 'none';
      self.labclock.dot.style.animation = 'none';
      self.labclock.unsetKeyboardListener();
      self.labclock.storeEndTrialTimes(e.elapsedTime, e.timeStamp);
      self.labclock.state = self.labclock.STATE_TRIAL_SELECTING;
      self.labclock.displayState();
    }
  },
  animationEndHandler: function (e) {
    self.labclock.dot.style.webkitAnimation = 'none';
    self.labclock.dot.style.mozAnimation = 'none';
    self.labclock.dot.style.animation = 'none';
    self.labclock.unsetKeyboardListener();
    self.labclock.storeEndTrialTimes(e.elapsedTime, e.timeStamp);
    self.labclock.state = self.labclock.STATE_TRIAL_SELECTING;
    self.labclock.displayState();
  },
  audioGetReadyEndHandler: function (e) {
    this.pause();
  },
  setKeyboardListener: function () {
    console.log('keypress listner')
    window.addEventListener('keypress', this.keypressHandler, false);
  },
  unsetKeyboardListener: function () {
    window.removeEventListener('keypress', this.keypressHandler, false);
  },
  setAudioListeners: function (i) {
    i = i || 0;
    this.audioGetReadyElements[i].addEventListener('ended', this.audioGetReadyEndHandler, false);
  },
  setButtonsListeners: function () {
    this.buttonPreviousElement.addEventListener('click', this.clickPrevious.bind(this), false);
    this.buttonOKElement.addEventListener('click', this.clickOK.bind(this), false);
    this.buttonNextElement.addEventListener('click', this.clickNext.bind(this), false);
  },
  setClockListeners: function () {
    console.log('setClockListeners')
    this.dot.addEventListener('webkitAnimationStart', this.animationStartHandler, false);
    this.dot.addEventListener('animationstart', this.animationStartHandler, false);
    this.dot.addEventListener('webkitAnimationIteration', this.animationIterationHandler, false);
    this.dot.addEventListener('animationiteration', this.animationIterationHandler, false);
    this.dot.addEventListener('webkitAnimationEnd', this.animationEndHandler, false);
    this.dot.addEventListener('animationend', this.animationEndHandler, false);
  },
  setClock: function (d, c, s, l) {
    var delay = d / 1000;
    delay += 's';
    var duration = c / 1000;
    duration += 's';
    if (s) {
      this.dot.style.webkitAnimation = 'counterspin';
      this.dot.style.mozAnimation = 'counterspin';
      this.dot.style.animation = 'counterspin';
    } else {
      this.dot.style.webkitAnimation = 'spin';
      this.dot.style.mozAnimation = 'spin';
      this.dot.style.animation = 'spin';
    }
    if (l) {
      this.dot.style.webkitAnimationIterationCount = l;
      this.dot.style.mozAnimationIterationCount = l;
      this.dot.style.animationIterationCount = l;
    } else {
      // set the amount of rotations you want here. 4 in this case...
      this.dot.style.webkitAnimationIterationCount = 4;
      this.dot.style.mozAnimationIterationCount = 4;
      this.dot.style.animationIterationCount = 4;
    }
    this.dot.style.webkitAnimationTimingFunction = 'linear';
    this.dot.style.mozAnimationTimingFunction = 'linear';
    this.dot.style.animationTimingFunction = 'linear';
    this.dot.style.webkitAnimationPlayState = 'paused';
    this.dot.style.mozAnimationPlayState = 'paused';
    this.dot.style.animationPlayState = 'paused';
    this.dot.style.webkitAnimationDelay = delay;
    this.dot.style.mozAnimationDelay = delay;
    this.dot.style.animationDelay = delay;
    this.dot.style.webkitAnimationDuration = duration;
    this.dot.style.mozAnimationDuration = duration;
    this.dot.style.animationDuration = duration;
    this.dot.style.webkitTransform = 'rotate(0deg)';
    this.dot.style.mozTransform = 'rotate(0deg)';
    this.dot.style.transform = 'rotate(0deg)';
  },
  startClock: function () {
    this.dot.style.webkitAnimationPlayState = 'running';
    this.dot.style.mozAnimationPlayState = 'running';
    this.dot.style.animationPlayState = 'running';
  },
  startTrial: function (playSound) {
    var progress;
    if (this.trialsIndex < this.experiment.phases[this.phasesIndex].trials.length) {
      this.dot.style.display = 'block';
      this.prepareFeedback(this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].feedback);
      this.trialCurrentLap = 1;
      console.log('reset trialCurrentLap')
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keypressTrialTimes = [];
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].keysPressed = [];
      // Allows first lap ON ALL TRIALS to be triggered
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].firstlap = true;

      // commented code below creates delay before trial starts
      // this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].delay = Math.floor(Math.random() * (this.experiment.randomDelayMax - this.experiment.randomDelayMin + 1) + this.experiment.randomDelayMin);
      //Random delay MUST be different to the previous one, otherwise CSS3 Animation won't reset
      // if (this.trialsIndex > 0) {
      //   while (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].delay === this.experiment.phases[this.phasesIndex].trials[this.trialsIndex-1].delay) {
      //     this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].delay = Math.floor(Math.random() * (this.experiment.randomDelayMax - this.experiment.randomDelayMin + 1) + this.experiment.randomDelayMin);
      //   }
      // }

      this.setClock(this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].delay, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].counterclockwise, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].laps);
      progress = this.trialsIndex * 800 / this.experiment.phases[this.phasesIndex].trials.length;
      this.expScreenProgress.style.width = progress + 'px';
      if (playSound) {
        this.state = this.STATE_TRIAL_READY;
      } else {
        this.state = this.STATE_TRIAL_RUNNING;
        this.startClock();
      }
    } else {
      this.state = this.STATE_PHASE_END;
    }
    this.displayState();
  },
  setAngle: function (x1, y1, x2, y2) {
    var theta = Math.atan2(x2-x1, y2-y1),
        degree = (theta * (180 / Math.PI) * -1) - 180,
        d = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    if (d < this.clockRadius) {
      if (degree < 0) {
        degree += 360;
      }
      this.dot.style.webkitTransform = 'rotate('+degree+'deg)';
      this.dot.style.mozTransform = 'rotate('+degree+'deg)';
      this.dot.style.transform = 'rotate('+degree+'deg)';
      this.dot.style.display = 'block';
      this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].angle = degree;
      if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].counterclockwise) {
        this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].guessTime = (360-degree) * this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle / 360;
      } else {
        console.log(degree, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle)
        console.log(this.trialLapPressed, 'lap pressed')
        console.log('degree * currentLap', degree * this.trialLapPressed)
        console.log('guess time', ((degree * this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle / 360) + ( (this.trialLapPressed - 1) * this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle)));

        this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].guessTime = ((degree * this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle / 360) + ( (this.trialLapPressed - 1) * this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle));

      }
      this.enableOKWhenSelected();
    }
  },
  clickWhenSelectingHandler: function (e) {
    var obj = this,
        leftValue = 0,
        topValue = 0;
    while (obj) {
      leftValue += obj.offsetLeft;
      topValue += obj.offsetTop;
      obj = obj.offsetParent;
    }
    var centerX = leftValue + this.offsetWidth / 2,
        centerY = topValue + this.offsetHeight / 2;
    self.labclock.setAngle(centerX, centerY, e.clientX, e.clientY);
  },
  noKeyPress: function () {
      setTimeout(this.startNextTrialHandler, 10);
  }, 
  startNextTrialHandler: function (e) {
    var _this = this;
    self.labclock.expScreenCaption.innerHTML = 'please press spacebar to begin the trial';
    // onkeyup function set to wait for spacebar before continuing.
    document.body.onkeyup = function(e){
        
        if(e.keyCode == 32){
          console.log('triggered spacebar!!!')
          self.labclock.trialsIndex++;
          self.labclock.startTrial(true);
          document.body.onkeyup = null;
        }
    }
  },
  setWhenSelectingListeners: function () {
    this.clock.addEventListener('click', this.clickWhenSelectingHandler, false);
  },
  unsetWhenSelectingListeners: function () {
    this.clock.removeEventListener('click', this.clickWhenSelectingHandler, false);
  },
  enableOKWhenSelected: function () {
    this.showButtons(false, true, false);
  },
  waitForToneToStartSelecting: function (t) {
    // 
    console.log('wait for tone to start selecting');
    if (self.labclock.audioContext.currentTime < t ) {
      setTimeout(self.labclock.waitForToneToStartSelecting, 5, t);
    } else {
      self.labclock.startSelecting();
    }
  },
  startSelecting: function () {
    if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime) {
      this.dot.style.webkitAnimationPlayState = 'paused';
      this.dot.style.mozAnimationPlayState = 'paused';
      this.dot.style.animationPlayState = 'paused';
      if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].response === 'text') {
        this.expScreenCaption.innerHTML = this.experiment.messages.trialSelectingText;
        this.expScreenTextboxValue.value = '';
        this.expScreenTextbox.style.display = 'block';
        this.showButtons(false, true, false);
      } else {
        this.expScreenCaption.innerHTML = this.experiment.messages.trialSelecting;
        this.setWhenSelectingListeners();
      }
    } else {
      this.dot.style.webkitAnimationPlayState = 'paused';
      this.dot.style.mozAnimationPlayState = 'paused';
      this.dot.style.animationPlayState = 'paused';
      this.noKeyPress();
    }
  },
  showPhaseScreen: function (i) {
    this.showButtons(false, true, false);
    this.expScreenTitle.innerHTML = this.experiment.phases[i].screen.title;
    this.expScreenContent.innerHTML = this.experiment.phases[i].screen.content;
  },
  storeExperimentData: function (earlyExit = false) {
    // This writes the csv file for download. If you wanted to add or remove a column of data, you will need to do so in both for loops.
    var results = '',
        resultsEnd = 'Full results\n',
        xhr, storageItem;
    results += this.experiment.code + '\n';
    results += Date() + '\n';
    storageItem = results;
    results += navigator.userAgent + '\n';
    for (var p = 0, lp = this.experiment.phases.length; p < lp; p++) {
      results += '\n' + this.experiment.phases[p].description + ',';
      results += 'Keypress,';
      results += 'Button Pressed,';
      results += 'W Report,';
      results += 'Tone\n';
      resultsEnd += '\n' + this.experiment.phases[p].description + ',';
      resultsEnd += 'delay,';
      resultsEnd += 'cycle,';
      resultsEnd += 'cycle time,';
      resultsEnd += 'tone,';
      resultsEnd += 'tone time,';
      resultsEnd += 'Keypress Trial Times,';
      resultsEnd += 'Start Trial Times,';
      resultsEnd += 'End Trial Time,';
      resultsEnd += 'Start Trial Audio Time\n';
      for (var t = 0, lt = this.experiment.phases[p].trials.length; t < lt; t++) {
        results += 'trial' + (t+1) + ',';
        results += this.experiment.phases[p].trials[t].keypressTrialTimes + ',';
        results += this.experiment.phases[p].trials[t].keysPressed + ',';
        results += this.experiment.phases[p].trials[t].guessTime + ',';
        results += this.experiment.phases[p].trials[t].tone + '\n';
        resultsEnd += 'trial' + t + ',';
        resultsEnd += this.experiment.phases[p].trials[t].delay + ',';
        resultsEnd += this.experiment.phases[p].trials[t].cycle + ',';
        resultsEnd += this.experiment.phases[p].trials[t].cycleTime + ',';
        resultsEnd += this.experiment.phases[p].trials[t].tone + ',';
        resultsEnd += this.experiment.phases[p].trials[t].toneTime + ',';
        resultsEnd += this.experiment.phases[p].trials[t].keypressTrialTimes + ',';
        resultsEnd += this.experiment.phases[p].trials[t].startTrialTime + ',';
        resultsEnd += this.experiment.phases[p].trials[t].endTrialTime + ',';
        resultsEnd += this.experiment.phases[p].trials[t].startTrialAudioTime + '\n';
      }
    }
    results += resultsEnd;
    console.log(results);
    if (this.experiment.postResultsURL) {
      xhr = new XMLHttpRequest();
      xhr.open('POST', this.experiment.postResultsURL, true);
      xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
      xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4) {
           if (xhr.status === 200) {
             window.console.log('Sent!');
           } else {
             window.console.log('Error ' + xhr.status);
           }
        }
      };
      try {
        xhr.send('data=' + results);
      } catch (e) {
        alert(this.experiment.messages.errorAJAX);
      }
    } 
    this.createCSV(results, earlyExit);
    if (Modernizr.localstorage) {
      window.localStorage.setItem(storageItem, results);
    }
  },
  createCSV: function(results, earlyExit = false){
    // Creates element for csv download on user page 
    if (this.experiment.generateCSV || !this.experiment.postResultsURL) {
      // Show CSV link in a new post-screen
      var screen = {
        title: this.experiment.messages.downloadTitle,
        content: '<p><a href="data:text/csv;charset=utf-8,' + encodeURIComponent(results) + '">' + this.experiment.messages.downloadData + '</a></p>'
      };
      this.experiment.postScreens.push(screen);
      if(earlyExit) $('#content').html(screen.content);
    }
  },
  showPostScreen: function (i) {
    if (i > 0) {
      this.showButtons(true, false, true);
    } else {
      this.showButtons(false, false, true);
    }
    this.postScreenTitle.innerHTML = this.experiment.postScreens[i].title;
    this.postScreenContent.innerHTML = this.experiment.postScreens[i].content;
  },
  nextPhase: function () {
    this.phasesIndex++;
    if (this.phasesIndex < this.experiment.phases.length) {
      this.state = this.STATE_PHASE_START;
    } else {
      this.storeExperimentData();
      this.state = this.STATE_POST;
    }
    this.displayState();
  },
  clickPrevious: function () {
    switch (this.state) {
      case this.STATE_PRE:
        this.preScreensIndex = (this.preScreensIndex > 0) ? this.preScreensIndex - 1 : 0;
        this.showPreScreen(this.preScreensIndex);
        break;
      case this.STATE_POST:
        this.postScreensIndex = (this.postScreensIndex > 0) ? this.postScreensIndex - 1 : 0;
        this.showPostScreen(this.postScreensIndex);
        break;
    }
  },
  clickOK: function () {
    console.log(this.state);
    switch (this.state) {
      case this.STATE_PASSWORD:
        var c = document.getElementById('pre_password_text').value;
        if (c === this.experiment.password) {
          this.state = this.STATE_PHASE_START;
          this.displayState();
        } else  {
          window.alert(this.experiment.messages.wrongPassword);
        }
        break;
      case this.STATE_TRIAL_SELECTING:
        var ok = true;
        if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].response === 'text') {
          console.log('1')
          // angle stores the value of the textbox, not the corresponding angle when using response: 'text'
          this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].angle = this.expScreenTextboxValue.value;
          // guessTime stores the estimation in ms considering the cycle time
          if (isNaN(parseFloat(this.expScreenTextboxValue.value))) {
            this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].guessTime = 0;
            ok = false;
          } else {
            console.log('this.trialCurrentLap')
            this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].guessTime = this.expScreenTextboxValue.value * (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle * this.trialCurrentLap) / 60;
            this.expScreenTextbox.style.display = 'none';
            ok = true;

          }
        } else {
          this.unsetWhenSelectingListeners();
        }
        // console.log('guess time',this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].guessTime)
        // console.log('text box value',this.expScreenTextboxValue.value)
        // console.log('cycle',this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].cycle)
        if (ok) {
          var _this = this;
          this.expScreenCaption.innerHTML = this.experiment.messages.initNextTrial;
          // onkeyup function set to wait for spacebar before continuing.
          document.body.onkeyup = function(e){
              
              if(e.keyCode == 32){
                console.log('triggered spacebar!!!')
                _this.trialsIndex++;
                _this.startTrial(true);
                document.body.onkeyup = null;
              }
          }
        }
        break;
      case this.STATE_PHASE_END:
        this.nextPhase();
        break;
    }
  },
  clickNext: function () {
    switch (this.state) {
      case this.STATE_PRE:
        this.preScreensIndex++;
        if (this.preScreensIndex < this.experiment.preScreens.length) {
          this.showPreScreen(this.preScreensIndex);
        } else {
          this.state = this.STATE_PASSWORD;
          this.displayState();
        }
        break;
      case this.STATE_POST:
        this.postScreensIndex++;
        if (this.postScreensIndex < this.experiment.postScreens.length) {
          this.showPostScreen(this.postScreensIndex);
        } else {
          //THE END...
          alert(this.experiment.messages.end);
        }
        break;
    }
  },       
  displayState: function () {
    switch (this.state) {
      case this.STATE_PRE:
        this.captionPrevious.innerHTML = this.experiment.messages.commandPrevious;
        this.captionOK.innerHTML = this.experiment.messages.commandOK;
        this.captionNext.innerHTML = this.experiment.messages.commandNext;
        this.preScreen.style.display = 'block';
        this.showPreScreen(this.preScreensIndex);
        break;
      case this.STATE_PASSWORD:
        this.showPasswordScreen();
        break;
      case this.STATE_PHASE_START:
        
       
        var _this = this;
        this.expScreenCaption.innerHTML = this.experiment.messages.initNextTrial;
        this.preScreenContent.innerHTML = 'Please press the space bar to begin.'
        document.body.onkeyup = function(e){
          if(e.keyCode == 32){

            _this.preScreen.style.display = 'none';
            _this.expScreen.style.display = 'block';
            _this.expScreenContent.style.display = 'none';
            _this.expScreenTextbox.style.display = 'none';
            _this.expScreenTitle.innerHTML = '';
            _this.expScreenClock.style.display = 'block';
            _this.showButtons(false, false, false);
            if(_this.experiment.phases[_this.phasesIndex].progress) {
              _this.expScreenProgress.style.display = 'block';
            } else {
              _this.expScreenProgress.style.display = 'none';
            }
            if(_this.experiment.phases[_this.phasesIndex].scramble) {
              _this.fisherYates(_this.experiment.phases[_this.phasesIndex].trials);
            }


            _this.startPhase();

            document.body.onkeyup = null;

          }
        }
        break;
      case this.STATE_TRIAL_READY:
        this.showButtons(false, false, false);
        if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].trialReady) {
          this.expScreenCaption.innerHTML = this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].trialReady;
        } else {
          this.expScreenCaption.innerHTML = this.experiment.messages.trialReady;
        }
        if (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].style) {
          for (var attr in this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].style) {
            this.body.style[attr] = this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].style[attr];
          }
        } else {
          this.body.style = this.bodyStyle;
        }
        this.playReady(this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].getReady);
        break;
      case this.STATE_TRIAL_SELECTING:
        this.dot.style.display = 'none';
        this.body.style = this.bodyStyle;
        //Do not start selecting until feedback tone ends
        if (this.audioContext.currentTime < this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialAudioTime + (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime + this.experiment.sounds.feedback.duration) / 1000) {
          setTimeout(this.waitForToneToStartSelecting, 5, this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].startTrialAudioTime + (this.experiment.phases[this.phasesIndex].trials[this.trialsIndex].toneTime + this.experiment.sounds.feedback.duration) / 1000);
        } else {
          this.startSelecting();
        }
        break;
      case this.STATE_PHASE_END:
        this.expScreenContent.style.display = 'block';
        this.expScreenClock.style.display = 'none';
        this.expScreenCaption.innerHTML = '';
        this.expScreenProgress.style.display = 'none';
        if (this.experiment.phases[this.phasesIndex].screen) {
          this.showPhaseScreen(this.phasesIndex);
        } else {
          this.nextPhase();
        }
        break;
      case this.STATE_POST:
        this.expScreen.style.display = 'none';
        this.postScreen.style.display = 'block';
        this.showPostScreen(this.postScreensIndex);
        break;
    }
  },
  sanityChecks: function () {
    var cssanimations = false,
        audio = false,
        resolution = false,
        errorHTML = '<p><strong>ERROR:</strong> ';
    if (!Modernizr.csstransforms || !Modernizr.cssanimations) {
      cssanimations = true;
      errorHTML += this.experiment.messages.errorCSSAnimations + '</p><br/>';
      errorHTML += '<p>' + this.experiment.messages.recommendBrowser + '</p>';
    }
    if (!Modernizr.audio || !Modernizr.audio.wav) {
      audio = true;
      errorHTML += this.experiment.messages.errorAudio + '</p><br/>';
      errorHTML += '<p>' + this.experiment.messages.recommendBrowser + '</p>';
    }
    if ((document.documentElement.clientWidth < 850) || (document.documentElement.clientHeight < 700)) {
      resolution = true;
      errorHTML += this.experiment.messages.errorResolution + '</p>';
    }
    if (cssanimations || audio || resolution) {
      this.preScreenContent.innerHTML = errorHTML;
      this.showButtons(false, false, false);
      return false;
    }
    return true;
  },
  selectExperiment: function (r) {
    var wrong = true,
        selected,
        options = [];
    for (var property in window.experiment) {
      options.push(property);
    }
    if (r) {
      //Random selection
      selected = Math.floor(Math.random() * options.length);
      this.experiment = window.experiment[options[selected]];
    } else {
      //Prompt
      selected = window.prompt(options + '?');
      upperSelected = selected.toUpperCase();
      wrong = options.indexOf(selected) === -1 && options.indexOf(upperSelected) === -1;
      while (wrong) {
        selected = window.prompt(options + '?');
        upperSelected = selected.toUpperCase();
        wrong = options.indexOf(selected) === -1 && options.indexOf(upperSelected) === -1;
      }
      if (options.indexOf(selected) === -1) {
        this.experiment = window.experiment[upperSelected];
      } else {
        this.experiment = window.experiment[selected];
      }
    }
  },
  start: function () {
    this.setButtonsListeners();
    this.selectExperiment(false); //set it to false to select the group manually
    this.state = this.STATE_PRE;
    this.displayState();
    if(this.sanityChecks()) {
      this.initAudio();
      this.setClockListeners();
    }
  }
};


