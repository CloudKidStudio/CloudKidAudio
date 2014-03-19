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
	_instance = null;
	
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
			if (true)
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
			if (true)
			{
				Debug.log("Load the JSON object directly");
			}
			validateData(dataURLorObject, onReady);	
		}
		else if (typeof dataURLorObject === "string")
		{
			if (true)
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
						if (true) Debug.error("Unable to load the audio sprite data from url '" + dataUrl + "'");
						onReady(false);
						return;
					}
					validateData(result.content, onReady);
				}
			);
		}
		else
		{
			if (true) Debug.error("Audio constructor data is not a URL or json object");
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
			if (true) Debug.error("Sprite JSON must contain resources array");
			success = false;
		}
		
		if (_data && _data.spritemap === undefined)
		{
			if (true) Debug.error("Sprite JSON must contain spritemap dictionary");
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
				if (true)
				{
					Debug.warn("Data must be setup and contain spritemap");
				}
				return false;
			}
			if (_data.spritemap[alias] === undefined)
			{
				if (true)
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
			if (true) Debug.error("Must load sprite data first.");
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
		_audioSprite = new SwishSprite(_data);
		_audioSprite.manualUpdate = true;

		// Add listener for the Loaded event
		var self = this;
		_audioSprite.on(SwishSprite.LOADED, function(){
			_audioSprite.off(SwishSprite.LOADED)
				.on(SwishSprite.PROGRESS, self._onUpdate.bind(self))
				.on(SwishSprite.COMPLETE, self._onComplete.bind(self));			
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
	*  @param {Function} onUpdate Function to return the current progress amount 0 to 1
	*/
	p.play = function(alias, onFinish, onUpdate)
	{
		if (!isReady(alias)) return;
		
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
	
	// Assign to the cloudkid namespace
	namespace('cloudkid').Audio = Audio;
	
}(window, document));
(function(undefined){
	
	"use strict";
	
	// Imports
	var Audio = cloudkid.Audio,
		OS = cloudkid.OS,
		Captions = cloudkid.Captions,
		Animator = cloudkid.Animator,
		PageVisibility = cloudkid.PageVisibility;
	
	/**
	*   AudioAnimation Handles playback of a single MovieClip in sync with a sound managed by cloudkid.Audio
	*	@class cloudkid.AudioAnimation
	*   @constructor
	*   @param {createjs.MovieClip} movieClip the animation to sync with sound
	*	@param {String} soundAlias the name of the sound to play with MovieClip
	*	@param {String*} frameLabel the alias of the animation sequence to sync with sound 
	*		Leave blank (or null) to play whole movieClip
	*	@param {Number*} numLoops the number of times to play the synced animation when play() is called. 
	*		value of 0 loops forever. Leave blank to play 1 time (or set as 1)
	*	@param {Number*} soundStartFrame frame number on which synced sound starts 
	*       (EaselJS frame numbers start at "0" where flash is "1")
	*/
	var AudioAnimation = function(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame)
	{
		this.initialize(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame);
	},
	
	// Reference to the prototype 
	p = AudioAnimation.prototype,
	
	/** 
	* Referece to current instance of Audio 
	* @private
	* @property {cloudkid.Audio}
	*/
	_audio = null,
	
	/** 
	* The current number of sound animations created 
	* @private
	* @property {int}
	* @default 0
	*/
	_audioAnims = 0;

	
	/** 
	* The MovieClip to sync with sound 
	* @private
	* @property {createjs.MovieClip} _clip
	*/
	p._clip = null;
	
	/** 
	* The page visibility detector 
	* @private
	* @property {cloudkid.PageVisibility} _visibility
	*/
	p._visibility = null;
	
	/** 
	* Name of the sound tp sync MovieClip to
	* @private
	* @property {String} _audioAlias
	*/
	p._audioAlias = null;
	
	/** 
	* Label of animation sequence to sync 
	* @private
	* @property {String} _frameLabel
	*/
	p._frameLabel = null;
	
	/** 
	* Numeric first frame of MovieClip in this animation sequence 
	* @private
	* @property {int} _animStartFrame
	*/
	p._animStartFrame = 0;
	
	/**
	* Numeric last frame of MovieClip in this animation sequence 
	* @private
	* @property {int} _animEndFrame
	*/
	p._animEndFrame = null;
	
	/** 
	* Number of frames in sequence 
	* @private
	* @property {int} _animDuration
	*/
	p._animDuration = 0;
	
	/** 
	* TweenJS Timeline Frame to start sound 
	* @private
	* @property {int} _audioStartFrame
	*/
	p._audioStartFrame = 0;
	
	/** 
	* Length of sound in frames 
	* @private
	* @property {int} _audioDuration
	*/
	p._audioDuration = 0;
	
	/** 
	* Has the sound started playing yet? 
	* @private
	* @property {Bool} _audioStarted
	* @default false
	*/
	p._audioStarted = false;
	
	/** 
	* Target frames per second of MovieClip 
	* @private
	* @property {int} _animationFPS
	* @default 24
	*/
	p._animationFPS = 24;
	
	/** 
	* Number of times to play through. 0 means infinite 
	* @private
	* @property {int} _totalLoops
	* @default 1
	*/
	p._totalLoops = 1;
	
	/** 
	* Keeps track of number of times played through 
	* @private
	* @property {int} _currentLoop
	* @default 0
	*/
	p._currentLoop = 0;
	
	/** 
	* Previous percentage progress value received from Audio 
	* @private
	* @property {Number} _lastProgress
	* @default 0
	*/
	p._lastProgress = 0;
	
	/** 
	* Has this animation been paused by the pause() function? 
	* @public
	* @property {Bool} paused
	* @default false
	* @readOnly
	*/
	p.paused = false;
	
	/** 
	* Reference to the AnimatorTimeline of current animation sequence 
	* @private
	* @property {cloudkid.AnimatorTimeline} _animation
	*/
	p._animation = null;
	
	/** 
	* Callback when we're done playing 
	* @private
	* @property {Function} _playCompleteCallback
	*/
	p._playCompleteCallback = null;
	
	/** 
	* Boolean to check if the sound is finished 
	* @private
	* @property {Bool} _audioDone
	*/
	p._audioDone = false;
	
	/** 
	* Boolean to check if the animation is done 
	* @private
	* @property {Bool} _animDone
	*/
	p._animDone = false;
	
	/** 
	* Fudge Factor – how many frames out of sync can we be before we make corrections
	* @private
	* @property {int} _syncDiff
	* @default 2
	*/
	p._syncDiff = 2;
	
	/** 
	* If this should also control some captions as well. 
	* @private
	* @property {Bool} _handleCaptions
	* @default false
	*/
	p._handleCaptions = false;
	
	/** 
	* A function to call when handling captions. 
	* @private
	* @property {Function} _captionUpdate
	*/
	p._captionUpdate = null;
			
	/**
	*  Constructor function for the AudioAnimation class
	*  @constructor
	*  @method initialize
	*  @param {createjs.MovieClip} movieClip Reference to the movie clip
	*  @param {String} soundAlias The alias to the sound to play
	*  @param {String*} frameLabel The frame label to play using Animator
	*  @param {Number*} numLoops The number of loops, defaults to 1, 0 is infinite
	*  @param {Number*} soundStartFrame Specify a start sound frame, default to sound start
	*/
	p.initialize = function(movieClip, soundAlias, frameLabel, numLoops, soundStartFrame)
	{
		this._clip = movieClip;
		this._audioAlias = soundAlias;
		this._frameLabel = (frameLabel === undefined) ? null : frameLabel;
		this._totalLoops = (numLoops === undefined) ? 1 : numLoops;
		
		if(this._frameLabel !== null)
		{
			this._animStartFrame = this._clip.timeline.resolve(this._frameLabel);
			if(this._totalLoops == 1)
			{
				this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_stop");
				if(this._animEndFrame === undefined)
				{
					this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_loop");
				}
			}
			else
			{
				this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_loop");
				if(this._animEndFrame === undefined)
				{
					this._animEndFrame = this._clip.timeline.resolve(this._frameLabel + "_stop");
				}
			}
		}
		else
		{
			this._animEndFrame = this._clip.timeline.duration - 1;
		}
		
		this._audioStartFrame = (soundStartFrame === undefined) ? this._animStartFrame : soundStartFrame;
		this._animDuration = this._animEndFrame - this._animStartFrame;
		
		if(_audio === null)
			_audio = Audio.instance;
		
		_audioAnims++;
		
		// Get the number of frames in the animation
		this._animationFPS = OS.instance.fps;
		this._audioDuration = Math.round(_audio.getLength(this._audioAlias) * this._animationFPS);
		
		if(this._audioDuration != this._animDuration && _audio.isLooping(this._audioAlias))
		{
			Debug.warn("The sound '" + this._audioAlias + "' and animation '" + this._frameLabel + "' aren't the same length (sound: " + this._audioDuration+ ", animation: " + this._animDuration + ")");
		}
		
		var self = this, autoPaused = -1;
		this._visibility = new PageVisibility(
			function()
			{
				if (autoPaused === 0) 
				{
					if (self._animation) self._animation.setPaused(false);
				}
				autoPaused = -1;
			},
			function() 
			{		
				if (autoPaused === -1)
				{
					// save the current status of the paused state
					autoPaused = self.paused ? 1 : 0;
				}
				if (self._animation) self._animation.setPaused(true);
			}
		);
	};
	
	/**
	*   Play Animation and Audio from beginning
	*   @method play
	*   @public
	*   @param {function} The optional callback when we're done playing, non-looping sound only!
	*/
	p.play = function(callback)
	{
		// Immediately stop any sound that's playing
		_audio.stop();
		
		this._playCompleteCallback = (callback !== undefined) ? callback : null;
		this._currentLoop = 1;
		this._handleCaptions = Captions && Captions.instance && Captions.instance.hasCaption(this._audioAlias);
		this._captionUpdate = this._handleCaptions ? Captions.instance.run(this._audioAlias) : null;
		this._startPlayback();
	};
	
	/** 
	* Play AudioAnimation after data is ready. Also used for looping
	* @method _startPlayback
	* @private
	*/
	p._startPlayback = function()
	{
		this._animation = null;
		this._lastProgress = 0;
		this._audioDone = false;
		this._animDone = false;
		this.paused = false;
		
		// is sound set to start within 2 frames of animation?
		if(this._audioStartFrame <= this._animStartFrame + this._syncDiff)
		{
			this._audioStarted = true;
			this._animation = Animator.play(
				this._clip,	
				this._frameLabel, 
				this._animationFinished.bind(this), 
				null, true
			);
			_audio.play(
				this._audioAlias, 
				this._audioFinished.bind(this),
				this._update.bind(this)
			);
		}
		else
		{
			if (true)
			{
				Debug.log("Delay starting sound because of frame offset");
			}
			
			this._clip.timeline.addEventListener("change", this._onFrameUpdate.bind(this));
			_audio.prepare(this._audioAlias);
			this._audioStarted = false;
			this._animation = Animator.play(
				this._clip,	
				this._frameLabel, 
				this._animationFinished.bind(this), 
				null, true
			);
		}
	};
	
	/** 
	*  We recieved loop callback from sound or the sound is over
	*  @private
	*  @method _audioFinished
	*/
	p._audioFinished = function()
	{
		if(!this._animDone && this._animation && this._animation.getPaused())
		{
			this._animation.setPaused(false);
		}
		this._audioDone = true;
		this._doneCheck();
	};
	
	/**
	*  Callback when the animation is finished
	*  @private
	*  @method _animationFinished
	*/
	p._animationFinished = function()
	{
		if(this._animation)
			this._animation.onComplete = null;
			
		this._animDone = true;
		this._doneCheck();
	};
	
	/** 
	*  Pause Animation and Audio at current position to be resumed later
	*  @method pause
	*  @public
	*/
	p.pause = function()
	{
		if (!this.paused)
		{
			this.paused = true;
			_audio.pause();
			if (this._animation) 
				this._animation.setPaused(true);
		}
	};
	
	/** 
	*  Resume playback of Audio and Animation from paused position 
	*  @method resume
	*  @public
	*/
	p.resume = function()
	{
		if (this.paused)
		{
			this.paused = false;
			_audio.resume();
			if (this._animation) 
				this._animation.setPaused(false);
		}
	};
	
	/** 
	*  Stop playing animation and sound, and forget about current position 
	*  @method stop
	*  @public
	*  @param {Bool} If we should do the callback (for instance, when skipping an animation)
	*/
	p.stop = function(doCallback)
	{
		_audio.stop();
		Animator.stop(this._clip);
		this.paused = true;
		this._animation = null;
		
		doCallback = (doCallback === undefined) ? false : doCallback;
		
		// Check to see if we should do the callback
		if(this._playCompleteCallback && doCallback) 
		{
			this._playCompleteCallback();
		}
		this._playCompleteCallback = null;	
	};
	
	/**
	*  Check to see if we should do the finishing callback
	*  @private
	*  @method _doneCheck
	*/
	p._doneCheck = function()
	{		
		// Don't do the callback if the animation or sound aren't finished
		// this make it so the animation or the sound can be longer
		if (!this._animDone || !this._audioDone) return;
		
		var infinite = this._totalLoops === 0;
		
		// Check to see if we should keep looping
		if (infinite || this._totalLoops > 1)
		{
			if(infinite || this._currentLoop < this._totalLoops)
			{
				Animator.stop(this._clip);
				this._currentLoop++;
				this._startPlayback();
			}
			else
			{
				this.stop(true);
			}
		}
		else
		{
			this.stop(true);
		}
	};
	
	/** 
	*   We recieved a progress event from the sound. 
	*   Let's make sure the animation isn't too far ahead or behind
	*   @method _update
	*   @private
	*   @param {Number} The current percentage
	*/
	p._update = function(progress)
	{
		if (this.paused) return;
		
		if(this._captionUpdate)
			this._captionUpdate(progress);
		
		// Audio is playing
		if(progress > this._lastProgress)
		{	
			if(progress == 1 && this._lastProgress === 0) return;
			// Save the last percent
			this._lastProgress = progress;
			
			// If the animation is done, ignore this
			if (this._animDone) return;
			
			// Audio position in frames
			var soundPos = parseInt(this._audioStartFrame, 10) + Math.round(this._audioDuration * this._lastProgress);
			
			// Clip position in frames
			var clipPos = this._clip.timeline.position;
			
			//if (true)
			//{
			//	Debug.log("Audio Position: " + soundPos + " start: " + this._audioStartFrame + " duration: " + this._audioDuration + " lastProgress: " + this._lastProgress + " clipPos: " + clipPos + " animStart: " + this._animStartFrame + " animEnd: " + this._animEndFrame);
			//}
			
			// The animation is behind, catch up
			if(soundPos > clipPos)
			{
				// Unpause the sound if it's paused
				if(this._animation.getPaused())
				{
					this._animation.setPaused(false);
				}
				
				if (soundPos > this._animEndFrame)
				{
					this._animationFinished();
				}
				else
				{
					this._clip.gotoAndPlay(soundPos);
				}
				
			}
			//Whoa, Nelly! – Slow down, animation
			else if(soundPos + this._syncDiff < clipPos && this._lastProgress != 1)
			{
				this._animation.setPaused(true);
			}
		}
	};
	
	/** 
	* Used to check if it's time to start a delayed sound 
	* @private
	* @method _onFrameUpdate
	*/
	p._onFrameUpdate = function()
	{
		if (true)
		{
			Debug.log("Anim Position: " + this._clip.timeline.position);
		}
		if(!this._audioStarted && this._clip.timeline.position >= this._audioStartFrame)
		{
			this._audioStarted = true;
			_audio.play(
				this._audioAlias, 
				this._audioFinished.bind(this),
				this._update.bind(this)
			);
			this._clip.timeline.removeAllEventListeners();
		}
	};
	
	/**  
	*  Clear data and remove all references, don't use object after this
	*  @public
	*  @method destroy
	*/
	p.destroy = function()
	{
		_audioAnims--;
		
		// If there are no more animation remove reference to sound class
		if(_audioAnims === 0) _audio = null;
		
		if (this._visibility)
		{
			this._visibility.destroy();
		}
		
		this._visibility =
		this._clip =
		this._audioAlias =
		this._totalLoops =
		this._frameLabel =
		this._animStartFrame =
		this._animEndFrame =
		this._animDuration =
		this._totalLoops =
		this._currentLoop =
		this._lastProgress =
		this._animation = null;
	};
	
	// Assign to the cloudkid namespace
	namespace('cloudkid').AudioAnimation = AudioAnimation;
}());
