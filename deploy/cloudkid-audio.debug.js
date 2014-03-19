!function(global, doc, undefined) {
    "use strict";
    var OS = cloudkid.OS, SwishSprite = cloudkid.SwishSprite, MediaLoader = cloudkid.MediaLoader, Audio = function(dataURLorObject, onReady) {
        this.initialize(dataURLorObject, onReady);
    }, p = Audio.prototype, _data = null, _destroyed = !1, _currentData = null, _currentAlias = null, _onFinish = null, _onUpdate = null, _paused = !1, _progress = 0, _muted = !1, _duration = 0, _silencePosition = 0, _updateAlias = "AudioMute", _updateSpriteAlias = "SwishSprite", _audioSprite = null, _instance = null;
    Audio.VERSION = "1.0.0", Audio.init = function(dataURLorObject, onReady) {
        return _instance || new Audio(dataURLorObject, onReady), _instance;
    }, Object.defineProperty(Audio, "instance", {
        get: function() {
            return _instance;
        }
    }), p.initialize = function(dataURLorObject, onReady) {
        return _instance ? (Debug.warn("Audio is already initialized, use Audio.instance"), 
        void 0) : (_destroyed = !1, _instance = this, "object" == typeof dataURLorObject ? (Debug.log("Load the JSON object directly"), 
        validateData(dataURLorObject, onReady)) : "string" == typeof dataURLorObject ? (Debug.log("Load from the URL " + dataURLorObject), 
        MediaLoader.instance.load(dataURLorObject, function(result) {
            return result && result.content ? (validateData(result.content, onReady), void 0) : (Debug.error("Unable to load the audio sprite data from url '" + dataUrl + "'"), 
            onReady(!1), void 0);
        })) : (Debug.error("Audio constructor data is not a URL or json object"), onReady(!1)), 
        void 0);
    };
    var validateData = function(data, callback) {
        _data = data;
        var success = !0;
        _data && _data.resources === undefined && (Debug.error("Sprite JSON must contain resources array"), 
        success = !1), _data && _data.spritemap === undefined && (Debug.error("Sprite JSON must contain spritemap dictionary"), 
        success = !1), callback(success);
    }, isReady = function(alias) {
        if (!_audioSprite) return !1;
        if (alias !== undefined) {
            if (!_data || !_data.spritemap) return Debug.warn("Data must be setup and contain spritemap"), 
            !1;
            if (_data.spritemap[alias] === undefined) return Debug.warn("Alias " + alias + " is not a valid sprite name"), 
            !1;
        }
        return !0;
    };
    p.getAudioSprite = function() {
        return _audioSprite;
    }, p.load = function(callback) {
        if (!_data) return Debug.error("Must load sprite data first."), void 0;
        var i, resource, cacheManager = MediaLoader.instance.cacheManager, len = _data.resources.length;
        for (i = 0; len > i; i++) resource = _data.resources[i], _data.resources[i] = cacheManager.prepare(resource.url !== undefined ? resource.url : resource, !0);
        _audioSprite = new SwishSprite(_data), _audioSprite.manualUpdate = !0;
        var self = this;
        _audioSprite.on(SwishSprite.LOADED, function() {
            _audioSprite.off(SwishSprite.LOADED).on(SwishSprite.PROGRESS, self._onUpdate.bind(self)).on(SwishSprite.COMPLETE, self._onComplete.bind(self)), 
            callback();
        }), OS.instance.addUpdateCallback(_updateSpriteAlias, _audioSprite.update), _audioSprite.load();
    }, p.prepare = function(alias) {
        isReady(alias) && _audioSprite.prepare(alias);
    }, p.isPlaying = function() {
        return !_paused;
    }, p.pause = function() {
        !_paused && _audioSprite && _currentData && (_muted ? this._stopSilence() : _audioSprite.pause(), 
        _paused = !0);
    }, p.resume = function() {
        _paused && _audioSprite && _currentData && (_muted ? this._startSilence() : _audioSprite.resume(), 
        _paused = !1);
    }, p.play = function(alias, onFinish, onUpdate) {
        isReady(alias) && (_paused || this.stop(), _currentAlias = alias, _currentData = _data.spritemap[alias], 
        _onFinish = onFinish || null, _onUpdate = onUpdate || null, _paused = !1, _progress = 0, 
        _silencePosition = 0, _muted ? this._playSilence() : this._playAudio());
    }, p._playSilence = function() {
        _duration = this.getLength(_currentAlias), _silencePosition = _audioSprite.getPosition(), 
        _onUpdate && _onUpdate(_progress), this._startSilence();
    }, p._startSilence = function() {
        OS.instance.addUpdateCallback(_updateAlias, this._updateSilence.bind(this));
    }, p._stopSilence = function() {
        OS.instance.removeUpdateCallback(_updateAlias);
    }, p._updateSilence = function(elapsed) {
        _silencePosition += elapsed / 1e3, _progress = _silencePosition / _duration, _duration > _silencePosition ? _onUpdate && _onUpdate(Math.min(1, Math.max(0, _progress))) : this._onComplete();
    }, p._playAudio = function() {
        _onUpdate && _onUpdate(_progress);
        var position;
        _silencePosition > 0 && (position = _audioSprite.getSound(_currentAlias).start + _silencePosition), 
        _audioSprite.play(_currentAlias, position);
    }, p._onUpdate = function(p) {
        _progress = p, _onUpdate && _onUpdate(_progress);
    }, p._onComplete = function() {
        _currentData && (_currentData.loop ? (_progress = 0, _silencePosition = 0, _onFinish && _onFinish()) : this.stop(!0));
    }, p.stop = function(doCallback) {
        _progress = 0, _silencePosition = 0, _onUpdate = null, _currentAlias = null, _currentData = null, 
        _paused = !0, _duration = 0, this._stopSilence();
        var callback = _onFinish;
        _onFinish = null, _audioSprite && _audioSprite.stop(), doCallback === undefined && (doCallback = !1), 
        doCallback && null !== callback && callback();
    }, p.getLength = function(alias) {
        return _data && _data.spritemap[alias] !== undefined ? _data.spritemap[alias].end - _data.spritemap[alias].start : 0;
    }, p.mute = function() {
        _muted || (_muted = !0, _audioSprite && _currentData && (_audioSprite.pause(), _paused || this._playSilence()));
    }, p.unmute = function() {
        _muted && (_muted = !1, _audioSprite && _currentData && (this._stopSilence(), _paused || this._playAudio()));
    }, p.getMuted = function() {
        return _muted;
    }, p.isLooping = function(alias) {
        return isReady(alias) ? _data.spritemap[alias].loop : void 0;
    }, p.getAliases = function(includeSilence) {
        var key, map = [];
        if (includeSilence) for (key in _data.spritemap) map.push(key); else for (key in _data.spritemap) "silence" != key && map.push(key);
        return map;
    }, p.destroy = function() {
        _destroyed || (this.stop(), _audioSprite && (OS.instance.removeUpdateCallback(_updateSpriteAlias), 
        _audioSprite.destroy()), _instance = _audioSprite = _data = _currentData = _currentAlias = _onUpdate = _onFinish = null, 
        _destroyed = !0);
    }, namespace("cloudkid").Audio = Audio;
}(window, document), function(undefined) {
    "use strict";
    var Audio = cloudkid.Audio, OS = cloudkid.OS, Captions = cloudkid.Captions, Animator = cloudkid.Animator, PageVisibility = cloudkid.PageVisibility, AudioAnimation = function(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame) {
        this.initialize(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame);
    }, p = AudioAnimation.prototype, _audio = null, _audioAnims = 0;
    p._clip = null, p._visibility = null, p._audioAlias = null, p._frameLabel = null, 
    p._animStartFrame = 0, p._animEndFrame = null, p._animDuration = 0, p._audioStartFrame = 0, 
    p._audioDuration = 0, p._audioStarted = !1, p._animationFPS = 24, p._totalLoops = 1, 
    p._currentLoop = 0, p._lastProgress = 0, p.paused = !1, p._animation = null, p._playCompleteCallback = null, 
    p._audioDone = !1, p._animDone = !1, p._syncDiff = 2, p._handleCaptions = !1, p._captionUpdate = null, 
    p.initialize = function(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame) {
        this._clip = movieClip, this._audioAlias = soundAlias, this._frameLabel = frameLabel === undefined ? null : frameLabel, 
        this._totalLoops = numLoops === undefined ? 1 : numLoops, null !== this._frameLabel ? (this._animStartFrame = this._clip.timeline.resolve(this._frameLabel), 
        1 == this._totalLoops ? (this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_stop"), 
        this._animEndFrame === undefined && (this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_loop"))) : (this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_loop"), 
        this._animEndFrame === undefined && (this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_stop")))) : this._animEndFrame = this._clip.timeline.duration - 1, 
        this._audioStartFrame = soundStartFrame === undefined ? this._animStartFrame : soundStartFrame, 
        this._animDuration = this._animEndFrame - this._animStartFrame, null === _audio && (_audio = Audio.instance), 
        _audioAnims++, this._animationFPS = OS.instance.fps, this._audioDuration = Math.round(_audio.getLength(this._audioAlias) * this._animationFPS), 
        this._audioDuration != this._animDuration && _audio.isLooping(this._audioAlias) && Debug.warn("The sound '" + this._audioAlias + "' and animation '" + this._frameLabel + "' aren't the same length (sound: " + this._audioDuration + ", animation: " + this._animDuration + ")");
        var self = this, autoPaused = -1;
        this._visibility = new PageVisibility(function() {
            0 === autoPaused && self._animation && self._animation.setPaused(!1), autoPaused = -1;
        }, function() {
            -1 === autoPaused && (autoPaused = self.paused ? 1 : 0), self._animation && self._animation.setPaused(!0);
        });
    }, p.play = function(callback) {
        _audio.stop(), this._playCompleteCallback = callback !== undefined ? callback : null, 
        this._currentLoop = 1, this._handleCaptions = Captions && Captions.instance && Captions.instance.hasCaption(this._audioAlias), 
        this._captionUpdate = this._handleCaptions ? Captions.instance.run(this._audioAlias) : null, 
        this._startPlayback();
    }, p._startPlayback = function() {
        this._animation = null, this._lastProgress = 0, this._audioDone = !1, this._animDone = !1, 
        this.paused = !1, this._audioStartFrame <= this._animStartFrame + this._syncDiff ? (this._audioStarted = !0, 
        this._animation = Animator.play(this._clip, this._frameLabel, this._animationFinished.bind(this), null, !0), 
        _audio.play(this._audioAlias, this._audioFinished.bind(this), this._update.bind(this))) : (Debug.log("Delay starting sound because of frame offset"), 
        this._clip.timeline.addEventListener("change", this._onFrameUpdate.bind(this)), 
        _audio.prepare(this._audioAlias), this._audioStarted = !1, this._animation = Animator.play(this._clip, this._frameLabel, this._animationFinished.bind(this), null, !0));
    }, p._audioFinished = function() {
        !this._animDone && this._animation && this._animation.getPaused() && this._animation.setPaused(!1), 
        this._audioDone = !0, this._doneCheck();
    }, p._animationFinished = function() {
        this._animation && (this._animation.onComplete = null), this._animDone = !0, this._doneCheck();
    }, p.pause = function() {
        this.paused || (this.paused = !0, _audio.pause(), this._animation && this._animation.setPaused(!0));
    }, p.resume = function() {
        this.paused && (this.paused = !1, _audio.resume(), this._animation && this._animation.setPaused(!1));
    }, p.stop = function(doCallback) {
        _audio.stop(), Animator.stop(this._clip), this.paused = !0, this._animation = null, 
        doCallback = doCallback === undefined ? !1 : doCallback, this._playCompleteCallback && doCallback && this._playCompleteCallback(), 
        this._playCompleteCallback = null;
    }, p._doneCheck = function() {
        if (this._animDone && this._audioDone) {
            var infinite = 0 === this._totalLoops;
            infinite || this._totalLoops > 1 ? infinite || this._currentLoop < this._totalLoops ? (Animator.stop(this._clip), 
            this._currentLoop++, this._startPlayback()) : this.stop(!0) : this.stop(!0);
        }
    }, p._update = function(progress) {
        if (!this.paused && (this._captionUpdate && this._captionUpdate(progress), progress > this._lastProgress)) {
            if (1 == progress && 0 === this._lastProgress) return;
            if (this._lastProgress = progress, this._animDone) return;
            var soundPos = parseInt(this._audioStartFrame, 10) + Math.round(this._audioDuration * this._lastProgress), clipPos = this._clip.timeline.position;
            soundPos > clipPos ? (this._animation.getPaused() && this._animation.setPaused(!1), 
            soundPos > this._animEndFrame ? this._animationFinished() : this._clip.gotoAndPlay(soundPos)) : soundPos + this._syncDiff < clipPos && 1 != this._lastProgress && this._animation.setPaused(!0);
        }
    }, p._onFrameUpdate = function() {
        Debug.log("Anim Position: " + this._clip.timeline.position), !this._audioStarted && this._clip.timeline.position >= this._audioStartFrame && (this._audioStarted = !0, 
        _audio.play(this._audioAlias, this._audioFinished.bind(this), this._update.bind(this)), 
        this._clip.timeline.removeAllEventListeners());
    }, p.destroy = function() {
        _audioAnims--, 0 === _audioAnims && (_audio = null), this._visibility && this._visibility.destroy(), 
        this._visibility = this._clip = this._audioAlias = this._totalLoops = this._frameLabel = this._animStartFrame = this._animEndFrame = this._animDuration = this._totalLoops = this._currentLoop = this._lastProgress = this._animation = null;
    }, namespace("cloudkid").AudioAnimation = AudioAnimation;
}();