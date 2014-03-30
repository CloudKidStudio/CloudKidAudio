(function(global, doc, undefined){
	
	"use strict";
	
	// Imports
	var OS = cloudkid.OS,
		SwishSprite = cloudkid.SwishSprite,
		MediaLoader = cloudkid.MediaLoader;
	
	/**
	* Audio class is designed to play audio sprites in a cross-platform compatible manner using HTML5 and the SwishSprite library.
	* @class cloudkid.Audio
	*/
	var Audio = function(dataURLorObject, onReady)
	{
		this._onUpdate = this._onUpdate.bind(this);
		this._onComplete = this._onComplete.bind(this);
		this.initialize(dataURLorObject, onReady);
	},
	
	// Reference to the prototype 
	p = Audio.prototype,
	
	/** 
	* Metadata regarding Primary Audio Sprite (URLs, Audio Timings)
	* @property {Dictionary} _data
	* @private
	*/
	_data = null,
	
	/** 
	* If the Audio instance has been destroyed 
	* @property {Bool} _data 
	* @default false
	* @private
	*/
	_destroyed = false,
	
	/** 
	* Contains start + stop times for current sound 
	* @property {object} _currentData
	* @private
	*/
	_currentData = null,
	
	/**
	* The current alias of the sound playing
	* @property {String} _currentAlias
	* @private
	*/
	_currentAlias = null,
	
	/** 
	* Function to call when sound reaches end 
	* @property {Function} _onFinish
	* @private
	*/
	_onFinish = null,
	
	/** 
	* Update the function 
	* @property {Function} _onUpdate
	* @private
	*/
	_onUpdate = null,
	
	/** 
	* Set true only if paused by pause() used to determine validity of resume() 
	* @property {Bool} _paused
	* @default false
	* @private
	*/
	_paused = false,
	
	/** 
	* The current progress amount from 0 to 1 
	* @property {Number} _progress
	* @private
	*/
	_progress = 0,
	
	/** 
	* If the sounds are muted 
	* @property {Bool} _muted
	* @private
	*/
	_muted = false,
	
	/** 
	* The length of silence to play in seconds
	* @property {Number} _duration
	* @private
	*/
	_duration = 0,
	
	/** 
	* The postion we're currently on if muted 
	* @property {Number} _silencePosition
	* @private
	*/
	_silencePosition = 0,
	
	/** 
	* The silence update alias 
	* @property {String} _updateAlias
	* @private
	* @default AudioMute
	*/
	_updateAlias = 'AudioMute',
	
	/** 
	* The alias for the audiosprite update 
	* @property {String} _updateSpriteAlias
	* @private
	* @default SwishSprite
	*/
	_updateSpriteAlias = 'SwishSprite',
	
	/** 
	* Instance of the SwishSprite class 
	* @property {cloudkid.SwishSprite} _audioSprite
	* @private
	*/
	_audioSprite = null,
	
	/** 
	* Singleton instance of sound player 
	* @private
	* @property {cloudkid.Audio} _instance
	*/
	_instance = null,

	/** 
	* The currently playing (and thus valid) AudioInst object.
	* @property {AudioInst} _currentInst
	* @private
	*/
	_currentInst = null;
	
	/** 
	* The global version of the library 
	* @static
	* @public
	* @property {String} VERSION
	*/
	Audio.VERSION = "${version}";
	
	/**
	* Static constructor initializing Audio (and soundManager)
	* @public
	* @static
	* @method init
	* @param {String|Object} dataURLorObject The optional sprite data url or sprite json object
	* @param {function} onReady function to call when Audio finished initializing
	*/
	Audio.init = function(dataURLorObject, onReady)
	{		
		if (!_instance)
		{
			new Audio(dataURLorObject, onReady);
		}
		return _instance;
	};
	
	/**
	*  Static function for getting the singleton instance
	*  @static
	*  @readOnly
	*  @public
	*  @property {cloudkid.Audio} instance
	*/
	Object.defineProperty(Audio, "instance", {
		get:function(){ return _instance; }
	});
	
	/**
	* Audio controller constructor
	* @constructor
	* @method initialize
	* @param {String|Object} dataURLorObject The optional sprite data url or sprite json object
	* @param {Function} onReady The callback function to call when finished initializing
	*/
	p.initialize = function(dataURLorObject, onReady)
	{
		if (_instance)
		{
			if (DEBUG)
			{
				Debug.warn("Audio is already initialized, use Audio.instance");
			}
			return;
		}
		
		_destroyed = false;
		_instance = this;
		
		// If the data is already an object, use that
		if (typeof dataURLorObject === "object")
		{
			if (DEBUG)
			{
				Debug.log("Load the JSON object directly");
			}
			validateData(dataURLorObject, onReady);	
		}
		else if (typeof dataURLorObject === "string")
		{
			if (DEBUG)
			{
				Debug.log("Load from the URL " + dataURLorObject);
			}
			
			// Load the JSON spritemap data
			MediaLoader.instance.load(
				dataURLorObject,
				function(result)
				{
					if (!result || !result.content)
					{
						if (DEBUG) Debug.error("Unable to load the audio sprite data from url '" + dataUrl + "'");
						onReady(false);
						return;
					}
					validateData(result.content, onReady);
				}
			);
		}
		else
		{
			if (DEBUG) Debug.error("Audio constructor data is not a URL or json object");
			onReady(false);
		}
	};
	
	/**
	* Validate that the sprite data is alright
	* @private
	* @method validateData
	* @param {object} data The audiosprite data
	* @param {Function} callback Method to call when we're completed
	*/
	var validateData = function(data, callback)
	{
		_data = data;
		
		var success = true;
		
		if (_data && _data.resources === undefined)
		{
			if (DEBUG) Debug.error("Sprite JSON must contain resources array");
			success = false;
		}
		
		if (_data && _data.spritemap === undefined)
		{
			if (DEBUG) Debug.error("Sprite JSON must contain spritemap dictionary");
			success = false;
		}
		callback(success);
	};
	
	/**
	* Check to make sure the audio is ready
	* @method isReady
	* @private
	* @param {String*} alias Optional alias to check for valid sprite sound
	* @return {Bool} If we can proceed with task
	*/
	var isReady = function(alias)
	{
		if (!_audioSprite) return false;
		
		if (alias !== undefined)
		{			
			if (!_data || !_data.spritemap)
			{
				if (DEBUG)
				{
					Debug.warn("Data must be setup and contain spritemap");
				}
				return false;
			}
			if (_data.spritemap[alias] === undefined)
			{
				if (DEBUG)
				{
					Debug.warn("Alias " + alias + " is not a valid sprite name");
				}
				return false;
			}
		}
		return true;
	};
	
	/**
	* Get the instance of the SwishSprite
	* @method getAudioSprite
	* @public
	* @return {cloudkid.SwishSprite}
	*/
	p.getAudioSprite = function()
	{
		return _audioSprite;
	};
	
	/**
	* Preload audio data for primary sprite, MUST be called by a click/touch event!!! 
	* @public 
	* @method load
	* @param {function} callback The callback function to call on load complete
	*/
	p.load = function(callback)
	{
		if (!_data) 
		{
			if (DEBUG) Debug.error("Must load sprite data first.");
			return;
		}
		var cacheManager = MediaLoader.instance.cacheManager,
			i, len = _data.resources.length, resource;
			
		// If there's a base path, prepend the url
		// also will take care of any versioning
		for(i = 0; i < len; i++)
		{
			resource = _data.resources[i];
			
			// Add the versioning/cache busting control to the resource URLs
			_data.resources[i] = cacheManager.prepare((resource.url !== undefined) ? resource.url : resource, true);
		}
		
		// Create the new audio sprite
		if(!_audioSprite)
		{
			_audioSprite = new SwishSprite(_data);
			_audioSprite.manualUpdate = true;
		}

		// Add listener for the Loaded event
		var self = this;
		_audioSprite.off(SwishSprite.LOADED);
		_audioSprite.on(SwishSprite.LOADED, function(){
			_audioSprite.off(SwishSprite.LOADED)
				.on(SwishSprite.PROGRESS, self._onUpdate)
				.on(SwishSprite.COMPLETE, self._onComplete);
			callback();
		});
		
		// Add the manual update from the OS
		OS.instance.addUpdateCallback(
			_updateSpriteAlias, 
			_audioSprite.update
		);
		
		// User load
		_audioSprite.load();
	};
	
	/**
	* Goto the beginning of a sound
	* @public 
	* @method prepare
	* @param {String} alias The sound alias
	*/
	p.prepare = function(alias)
	{
		if (!isReady(alias)) return;
		_audioSprite.prepare(alias);
	};
	
	/** 
	* Returns true if a sound is currently being played
	* @public 
	* @method isPlaying
	* @return {Bool} If the audio is current playing
	*/
	p.isPlaying = function()
	{
		return !_paused;
	};
	
	/** 
	*  Used if we need to pause the current sound and resume later 
	*  @method pause
	*  @public
	*/
	p.pause = function()
	{
		if(!_paused && _audioSprite && _currentData)
		{
			if (_muted)
			{
				this._stopSilence();
			}
			else
			{
				_audioSprite.pause();
			}
			_paused = true;
		}
	};
	
	/** 
	*  Used to resume sound paused with pause(); 
	*  @method resume
	*  @public
	*/
	p.resume = function()
	{
		// make sure resume can only be activated once
		if(_paused && _audioSprite && _currentData)
		{
			// If we're mute we'll resume the silence
			if (_muted)
			{
				this._startSilence();
			}
			// Else resume the sound
			else
			{
				_audioSprite.resume();
			}
			_paused = false;
		}
	};
	
	/**
	*  Play sound from sprite by Alias
	*  @method play
	*  @public
	*  @param {String} alias Name of sound to play
	*  @param {Function} onFinish Function called when the sound is done
	*  @param {Function} onStart Function to be called when playback starts.
	*		This is called immediately, and is here to provide compatibility in usage with cloudkid.Sound.
	*  @param {Function} onUpdate Function to return the current progress amount 0 to 1
	*/
	p.play = function(alias, onFinish, onStart, onUpdate)
	{
		if (!isReady(alias)) return null;
		
		if(!_paused) this.stop();
		
		_currentAlias = alias;
		_currentData = _data.spritemap[alias];
		_onFinish = onFinish || null;
		_onUpdate = onUpdate || null;
		
		_paused = false;
		
		_progress = 0;
		_silencePosition = 0;
		
		// If we're muted we need to do a special timer 
		// to play silence for iOS because mute/volume on the
		// <audio> element is read-only
		if (_muted)
		{
			this._playSilence();
		}
		else
		{
			this._playAudio();
		}
		var inst = _currentInst = new AudioInst();
		inst._end = _currentData.end * 1000;
		inst._start = _currentData.start * 1000;
		inst.length = inst._end - inst._start;
		
		setTimeout(onStart, 0);//call onStart ASAP after function returns the AudioInst
		
		return inst;
	};
	
	/**
	* Start playing the silence when muted
	* @private
	* @method _playSilence
	*/
	p._playSilence = function()
	{
		// Get the duration of the sprite in milliseconds
		_duration = this.getLength(_currentAlias);
		
		// Get the current time in milliseconds
		_silencePosition = _audioSprite.getPosition();
		
		if (_onUpdate) _onUpdate(_progress);
		
		this._startSilence();
	};
	
	/**
	* Start the silence timer
	* @private
	* @method _startSilence
	*/
	p._startSilence = function()
	{
		OS.instance.addUpdateCallback(
			_updateAlias, 
			this._updateSilence.bind(this)
		);
	};
	
	/**
	* Stop the silence update
	* @private
	* @method _stopSilence
	*/
	p._stopSilence = function()
	{
		OS.instance.removeUpdateCallback(_updateAlias);
	};
	
	/**
	* Progress update for the silence playing
	* @private
	* @method _updateSilence
	* @param {Number} elapsed The number of ms elapsed since last update
	*/
	p._updateSilence = function(elapsed)
	{
		_silencePosition += (elapsed / 1000);
		_progress = _silencePosition / _duration;
		
		if (_silencePosition < _duration)
		{			
			if (_onUpdate) _onUpdate(Math.min(1, Math.max(0, _progress)));
		}
		// We're done
		else
		{
			this._onComplete();
		}
	};
	
	/**
	* Internal method to play the audio
	* @private
	* @method _playAudio
	*/
	p._playAudio = function()
	{	
		if (_onUpdate) _onUpdate(_progress);
		
		var position;
		
		// When unmuting from silence
		if (_silencePosition > 0)
		{
			position = _audioSprite.getSound(_currentAlias).start + _silencePosition;
		}
		_audioSprite.play(_currentAlias, position);
	};
	
	/**
	* Callback for the progress change update on the audio sprite
	* @private 
	* @method _onUpdate
	* @param {Number} p The progress from 0 to 1 of how much of the sprite we've completed
	*/
	p._onUpdate = function(p)
	{
		_progress = p;
		
		if (_onUpdate) _onUpdate(_progress);
	};
	
	/**
	* When either the sound or mute has finished
	* @private
	* @method _onComplete
	*/
	p._onComplete = function()
	{		
		if (!_currentData) return;
		
		if (_currentData.loop)
		{
			_progress = 0;
			_silencePosition = 0;
			
			if (_onFinish) _onFinish();
		}
		else
		{
			// Do a regular stop and do the callback
			this.stop(true);
		}
	};
	
	/** 
	*  Used if we need to stop playing a sound and we don't 
	*  need to resume from the current position 
	*  @public
	*  @method stop
	*  @param {Bool} doCallback If the callback should be called after stop
	*/
	p.stop = function(doCallback)
	{
		_progress = 0;
		_silencePosition = 0;
		_onUpdate = null;
		_currentAlias = null;
		_currentData = null;
		_paused = true;
		_duration = 0;
		if(_currentInst)
		{
			_currentInst.isValid = false;
			_currentInst = null;
		}
		
		// cancel the update if it's running
		this._stopSilence();
		
		var callback = _onFinish;
		_onFinish = null;
		
		if(_audioSprite)
			_audioSprite.stop();
		
		if(doCallback === undefined)
		{
			doCallback = false;
		}
		
		if (doCallback && callback !== null)
		{
			callback();
		}
	};
	
	/** 
	* Returns length in seconds of named sprite sound 
	* @method getLength
	* @public
	* @param {String} alias The sound alias
	* @return {Number} The number of a seconds duration of a sprite
	*/
	p.getLength = function(alias)
	{	
		if (_data && _data.spritemap[alias] !== undefined)
			return _data.spritemap[alias].end - _data.spritemap[alias].start;
		return 0;
	};
	
	/**
	* Set if the audio is muted
	* @public
	* @method mute
	*/
	p.mute = function()
	{
		if (!_muted)
		{
			_muted = true;
			if (_audioSprite && _currentData)
			{
				_audioSprite.pause();
				if (!_paused) this._playSilence();
			}
		}
	};
	
	/**
	* Set if the audio should turn off mute mode
	* @public
	* @method unmute
	*/
	p.unmute = function()
	{
		if (_muted)
		{
			_muted = false;
			if (_audioSprite && _currentData)
			{
				this._stopSilence();
				if (!_paused) this._playAudio();
			}
		}	
	};
	
	/**
	* Get the mute status of the audio
	* @method getMuted
	* @public
	* @return {Bool} If the audio is muted
	*/
	p.getMuted = function()
	{
		return _muted;
	};
	
	/** 
	* Returns value of loop property for named sound 
	* @public
	* @method isLooping
	* @param {Bool} alias If the alias is set to loop
	*/
	p.isLooping = function(alias)
	{
		if (!isReady(alias)) return;
		
		return _data.spritemap[alias].loop;
	};

	/** 
	* Returns array of sound aliases in spritemap
	* @public
	* @method getAliases
	* @param {Bool} includeSilence If array should include silence alias
	* @return {Array} sound aliases
	*/
	p.getAliases = function(includeSilence)
	{
		var key;
		var map = [];
		if(includeSilence)
		{
			for(key in _data.spritemap)
			{
				map.push(key);
			}
		}
		else
		{
			for(key in _data.spritemap)
			{
				if(key != "silence")
					map.push(key);
			}
		}
		return map;
	};
	
	/**
	* Don't use after this, destroys singleton and releases all references
	* @public
	* @method destroy
	*/
	p.destroy = function()
	{
		if(_destroyed) return;
		
		this.stop();
		
		if (_audioSprite)
		{
			// Remove the manual update
			OS.instance.removeUpdateCallback(_updateSpriteAlias);
			_audioSprite.destroy();
		}
		
		_instance = 
		_audioSprite =
		_data =
		_currentData =
		_currentAlias = 
		_onUpdate =
		_onFinish = null;
		
		_destroyed = true;
	};

	/**
	*  A playing instance of a sound. This class is primarily for compatability/standardization with CloudKidSound,
	*  and to make syncing animation with audio easier. These can only be created through cloudkid.Audio.instance.play().
	*  @class AudioInst
	*/
	var AudioInst = function()
	{
		/**
		*	If this AudioInst is still valid (still the actively playing audio bit).
		*	If this is false, then Audio is no longer playing this sound and this object should be discarded.
		*	@property {bool} isValid
		*	@public
		*/
		this.isValid = true;
		/**
		*	The start time of the sound in milliseconds.
		*	@property {Number} _start
		*	@private
		*/
		this._start = 0;
		/**
		*	The end time of the sound in milliseconds.
		*	@property {Number} _end
		*	@private
		*/
		this._end = 0;
		/**
		*	The length of the sound in milliseconds.
		*	@property {Number} length
		*	@public
		*/
		this.length = 0;
	};

	/**
	*	The position of the sound playhead in milliseconds, or 0 if the AudioInst is no longer valid.
	*	@property {Number} position
	*	@public
	*/
	Object.defineProperty(AudioInst.prototype, "position", {
		get: function() {
			return (this.isValid && _audioSprite) ? (_muted ? _silencePosition * 1000 : _audioSprite.getPosition() * 1000 - this._start) : 0;
		}
	});

	/**
	*	Stops Audio, if this AudioInst is still valid.
	*	@method stop
	*	@public
	*/
	AudioInst.prototype.stop()
	{
		if(this.isValid)
		{
			_instance.stop();
		}
	};

	/**
	*	Pauses Audio, if this AudioInst is still valid.
	*	@method pause
	*	@public
	*/
	AudioInst.prototype.pause()
	{
		if(this.isValid)
		{
			_instance.pause();
		}
	};

	/**
	*	Resumes playing Audio, if this AudioInst is still valid.
	*	@method unpause
	*	@public
	*/
	AudioInst.prototype.unpause()
	{
		if(this.isValid)
		{
			_instance.resume();
		}
	};
	
	// Assign to the cloudkid namespace
	namespace('cloudkid').Audio = Audio;
	
}(window, document));