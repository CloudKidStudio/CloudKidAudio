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
			if (DEBUG)
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
			
			//if (DEBUG)
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
		if (DEBUG)
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