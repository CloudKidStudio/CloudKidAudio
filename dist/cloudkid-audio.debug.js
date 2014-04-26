!function(global, doc, undefined) {
    "use strict";
    var OS = cloudkid.OS, SwishSprite = cloudkid.SwishSprite, MediaLoader = cloudkid.MediaLoader, Audio = function(dataURLorObject, onReady) {
        this._onUpdate = this._onUpdate.bind(this), this._onComplete = this._onComplete.bind(this), 
        this.initialize(dataURLorObject, onReady);
    }, p = Audio.prototype, _data = null, _destroyed = !1, _currentData = null, _currentAlias = null, _onFinish = null, _onUpdate = null, _paused = !1, _progress = 0, _muted = !1, _duration = 0, _silencePosition = 0, _updateAlias = "AudioMute", _updateSpriteAlias = "SwishSprite", _audioSprite = null, _instance = null, _currentInst = null;
    p.soundLoaded = !1, Audio.VERSION = "2.0.2", Audio.init = function(dataURLorObject, onReady) {
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
        _audioSprite || (_audioSprite = new SwishSprite(_data), _audioSprite.manualUpdate = !0);
        var self = this;
        _audioSprite.off(SwishSprite.LOADED), _audioSprite.on(SwishSprite.LOADED, function() {
            _audioSprite.off(SwishSprite.LOADED).on(SwishSprite.PROGRESS, self._onUpdate).on(SwishSprite.COMPLETE, self._onComplete), 
            self.soundLoaded = !0, callback();
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
    }, p.play = function(alias, onFinish, onStart, onUpdate) {
        return isReady(alias) ? (_paused || this.stop(), _currentAlias = alias, _currentData = _data.spritemap[alias], 
        _onFinish = onFinish || null, _onUpdate = onUpdate || null, _paused = !1, _progress = 0, 
        _silencePosition = 0, _muted ? this._playSilence() : this._playAudio(), _currentInst = new AudioInst(), 
        _currentInst._end = 1e3 * _currentData.end, _currentInst._start = 1e3 * _currentData.start, 
        _currentInst.length = _currentInst._end - _currentInst._start, "function" == typeof onStart && setTimeout(onStart, 0), 
        _currentInst) : null;
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
        _paused = !0, _duration = 0, _currentInst && (_currentInst.isValid = !1, _currentInst = null), 
        this._stopSilence();
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
    }, p.hasAlias = function(alias) {
        return _data ? !!_data.spritemap[alias] : !1;
    }, p.getAliases = function(includeSilence) {
        var key, map = [];
        if (includeSilence) for (key in _data.spritemap) map.push(key); else for (key in _data.spritemap) "silence" != key && map.push(key);
        return map;
    }, p.destroy = function() {
        _destroyed || (this.stop(), _audioSprite && (OS.instance.removeUpdateCallback(_updateSpriteAlias), 
        _audioSprite.destroy()), _instance = _audioSprite = _data = _currentData = _currentAlias = _onUpdate = _onFinish = null, 
        _destroyed = !0);
    };
    var AudioInst = function() {
        this.isValid = !0, this._start = 0, this._end = 0, this.length = 0;
    };
    Object.defineProperty(AudioInst.prototype, "position", {
        get: function() {
            return this.isValid && _audioSprite ? _muted ? 1e3 * _silencePosition : 1e3 * _audioSprite.getPosition() : 0;
        }
    }), AudioInst.prototype.stop = function() {
        this.isValid && _instance.stop();
    }, AudioInst.prototype.pause = function() {
        this.isValid && _instance.pause();
    }, AudioInst.prototype.unpause = function() {
        this.isValid && _instance.resume();
    }, namespace("cloudkid").Audio = Audio;
}(window, document), function() {
    var Captions, Audio, OS, VOPlayer = function(useCaptions) {
        Captions = cloudkid.Captions, Audio = cloudkid.Audio, OS = cloudkid.OS, this._audioListener = this._onAudioFinished.bind(this), 
        this._update = this._update.bind(this), this._updateCaptionPos = this._updateCaptionPos.bind(this), 
        useCaptions && (this.captions = useCaptions instanceof Captions ? useCaptions : new Captions(), 
        this.captions.isSlave = !0), this._listHelper = [];
    }, p = VOPlayer.prototype = {}, ALIAS = "VOPlayer";
    p.audioList = null, p._listCounter = 0, p._currentAudio = null, p._audioInst = null, 
    p._callback = null, p._audioListener = null, p._timer = 0, p.captions = null, p._listHelper = null, 
    Object.defineProperty(p, "playing", {
        get: function() {
            return null !== this._currentAudio || this._timer > 0;
        }
    }), p.play = function(id, callback) {
        this.stop(), this._listCounter = -1, this._listHelper[0] = id, this.audioList = this._listHelper, 
        this._callback = callback, this._onAudioFinished();
    }, p.playList = function(list, callback) {
        this.stop(), this._listCounter = -1, this.audioList = list, this._callback = callback, 
        this._onAudioFinished();
    }, p._onAudioFinished = function() {
        if (OS.instance.removeUpdateCallback(ALIAS), this.captions && this._audioInst && this.captions.seek(this._audioInst.length), 
        this._audioInst = null, this._listCounter++, this._listCounter >= this.audioList.length) {
            this.captions && this.captions.stop(), this._currentAudio = null;
            var c = this._callback;
            this._callback = null, c && c();
        } else this._currentAudio = this.audioList[this._listCounter], "string" == typeof this._currentAudio ? this._playAudio() : "function" == typeof this._currentAudio ? (this._currentAudio(), 
        this._onAudioFinished()) : (this._timer = this._currentAudio, this._currentAudio = null, 
        OS.instance.addUpdateCallback(ALIAS, this._update));
    }, p._update = function(elapsed) {
        this.captions && this.captions.updateTime(elapsed), this._timer -= elapsed, this._timer <= 0 && this._onAudioFinished();
    }, p._updateCaptionPos = function() {
        this._audioInst && this.captions.seek(this._audioInst.position);
    }, p._playAudio = function() {
        var s = Audio.instance;
        !s.hasAlias(this._currentAudio) && this.captions && this.captions.hasCaption(this._currentAudio) ? (this.captions.play(this._currentAudio), 
        this._timer = this.captions.currentDuration, this._currentAudio = null, OS.instance.addUpdateCallback(ALIAS, this._update)) : (this._audioInst = s.play(this._currentAudio, this._audioListener), 
        this.captions && (this.captions.play(this._currentAudio), OS.instance.addUpdateCallback(ALIAS, this._updateCaptionPos)));
    }, p.stop = function() {
        this._currentAudio && (Audio.instance.stop(), this._currentAudio = null, this._callback = null), 
        this.captions && this.captions.stop(), OS.instance.removeUpdateCallback(ALIAS), 
        this.audioList = null, this._timer = 0;
    }, p.destroy = function() {
        this.stop(), this.audioList = null, this._listHelper = null, this._currentAudio = null, 
        this._audioInst = null, this._callback = null, this._audioListener = null, this.captions && (this.captions.destroy(), 
        this.captions = null);
    }, namespace("cloudkid").VOPlayer = VOPlayer;
}();