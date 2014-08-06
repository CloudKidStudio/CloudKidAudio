/**
*  @module cloudkid
*/
(function() {

	"use strict";
	
	// Class Imports, we'll actually include them in the constructor
	// in case these classes were included after in the load-order
	var Captions,
		Audio,
		OS;

	/**
	*	A class for managing audio by only playing one at a time, playing a list, and even
	*	managing captions (CloudKidCaptions library) at the same time.
	*	@class VOPlayer
	*	@constructor
	*	@param {bool|cloudkid.Captions} [useCaptions=false] If a cloudkid.Captions object should be created for use 
	*			or the captions object to use
	*/
	var VOPlayer = function(useCaptions)
	{
		// Import classes
		Captions = cloudkid.Captions;
		Audio = cloudkid.Audio;
		OS = cloudkid.OS;

		this._audioListener = this._onAudioFinished.bind(this);
		this._update = this._update.bind(this);
		this._updateCaptionPos = this._updateCaptionPos.bind(this);

		if (useCaptions)
		{
			this.captions = useCaptions instanceof Captions ? useCaptions : new Captions();
			this.captions.isSlave = true;
		}
		this._listHelper = [];
	};
	
	// Reference to the prototype
	var p = VOPlayer.prototype = {};
	
	/**
	*  The OS update callback alias for the VOPlayer
	*  @property {String} ALIAS
	*  @static
	*  @final
	*  @private
	*/
	var ALIAS = "VOPlayer";

	/**
	*	The current list of audio/silence times/functions. Generally you will not need to modify this.
	*	@property {Array} audioList
	*	@public
	*/
	p.audioList = null;

	/**
	*	The current position in audioList.
	*	@property {int} _listCounter
	*	@private
	*/
	p._listCounter = 0;

	/**
	*	The current audio alias being played.
	*	@property {String} _currentAudio
	*	@private
	*/
	p._currentAudio = null;

	/**
	*	The current audio instance being played.
	*	@property {SoundInst} _audioInst
	*	@private
	*/
	p._audioInst = null;

	/**
	*	The callback for when the list is finished.
	*	@property {function} _callback
	*	@private
	*/
	p._callback = null;

	/**
	*	The callback for when the list is interrupted for any reason.
	*	@property {function} _cancelledCallback
	*	@private
	*/
	p._cancelledCallback = null;

	/**
	*	The bound _onAudioFinished call.
	*	@property {function} _audioListener
	*	@private
	*/
	p._audioListener = null;

	/**
	*	A timer for silence entries in the list, in milliseconds.
	*	@property {int} _timer
	*	@private
	*/
	p._timer = 0;

	/**
	*	The cloudkid.Captions object used for captions. The developer is responsible for initializing this with a captions
	*	dictionary config file and a reference to a text field.
	*	@property {cloudkid.Captions} captions
	*	@public
	*/
	p.captions = null;

	/**
	*	An Array used when play() is called to avoid creating lots of Array objects.
	*	@property {Array} _listHelper
	*	@private
	*/
	p._listHelper = null;

	/**
	*	If VOPlayer is currently playing (audio or silence).
	*	@property {bool} playing
	*	@public
	*	@readOnly
	*/
	Object.defineProperty(p, "playing",
	{
		get: function() { return this._currentAudio !== null || this._timer > 0; }
	});
	
	/**
	*	Plays a single audio alias, interrupting any current playback.
	*	@method play
	*	@public
	*	@param {String} id The alias of the audio file to play.
	*	@param {function} callback The function to call when playback is complete.
	*	@param {function} cancelledCallback The function to call when playback is interrupted with a stop(), play() or playList() call.
	*/
	p.play = function(id, callback, cancelledCallback)
	{
		this.stop();
		this._listCounter = -1;
		this._listHelper[0] = id;
		this.audioList = this._listHelper;
		this._callback = callback;
		this._cancelledCallback = cancelledCallback;
		this._onAudioFinished();
	};
	
	/**
	*	Plays a list of audio files, timers, and/or functions, interrupting any current playback.
	*	Audio in the list will be preloaded to minimize pauses for loading.
	*	@method playList
	*	@public
	*	@param {Array} list The array of items to play/call in order.
	*	@param {function} callback The function to call when playback is complete.
	*	@param {function} cancelledCallback The function to call when playback is interrupted with a stop(), play() or playList() call.
	*/
	p.playList = function(list, callback, cancelledCallback)
	{
		this.stop();
		this._listCounter = -1;
		this.audioList = list;
		this._callback = callback;
		this._cancelledCallback = cancelledCallback;
		this._onAudioFinished();
	};
	
	/**
	*	Callback for when audio/timer is finished to advance to the next item in the list.
	*	@method _onAudioFinished
	*	@private
	*/
	p._onAudioFinished = function()
	{
		//remove any update callback
		OS.instance.removeUpdateCallback(ALIAS);

		//if we have captions and an audio instance, set the caption time to the length of the audio
		if (this.captions && this._audioInst)
		{
			this.captions.seek(this._audioInst.length);
		}
		//clear the audio instance
		this._audioInst = null;

		//advance list
		this._listCounter++;

		//if the list is complete
		if (this._listCounter >= this.audioList.length)
		{
			if (this.captions)
			{
				this.captions.stop();
			}
			this._currentAudio = null;
			this._cancelledCallback = null;
			var c = this._callback;
			this._callback = null;
			if (c) c();
		}
		else
		{
			this._currentAudio = this.audioList[this._listCounter];

			if (typeof this._currentAudio == "string")
			{
				//If the sound doesn't exist, then we play it and let it fail, 
				// an error should be shown and playback will continue
				this._playAudio();
			}
			else if (typeof this._currentAudio == "function")
			{
				//call function
				this._currentAudio();

				//immediately continue
				this._onAudioFinished();
			}
			else
			{
				//set up a timer to wait
				this._timer = this._currentAudio;
				this._currentAudio = null;
				OS.instance.addUpdateCallback(ALIAS, this._update);
			}
		}
	};

	/**
	*	The update callback used for silence timers and updating captions without active audio.
	*	This method is bound to the VOPlayer instance.
	*	@method _update
	*	@private
	*	@param {int} elapsed The time elapsed since the previous frame, in milliseconds.
	*/
	p._update = function(elapsed)
	{
		if (this.captions)
		{
			this.captions.updateTime(elapsed);
		}
		this._timer -= elapsed;
		if (this._timer <= 0)
		{
			this._onAudioFinished();
		}
	};

	/**
	*	The update callback used for updating captions with active audio.
	*	This method is bound to the VOPlayer instance.
	*	@method _updateCaptionPos
	*	@private
	*	@param {int} elapsed The time elapsed since the previous frame, in milliseconds.
	*/
	p._updateCaptionPos = function(elapsed)
	{
		if (!this._audioInst) return;
		//if the audio was interrupted directly, then we should stop pretending that it is still playing
		if(!this._audioInst.isValid)
		{
			this.stop();
			return;
		}
		this.captions.seek(this._audioInst.position);
	};

	/** 
	*	Plays the current audio item and begins preloading the next item.
	*	@method _playAudio
	*	@private
	*/
	p._playAudio = function()
	{
		var s = Audio.instance;
		if (!s.hasAlias(this._currentAudio) && this.captions && this.captions.hasCaption(this._currentAudio))
		{
			this.captions.play(this._currentAudio);
			this._timer = this.captions.currentDuration;
			this._currentAudio = null;
			OS.instance.addUpdateCallback(ALIAS, this._update);
		}
		else
		{
			this._audioInst = s.play(this._currentAudio, this._audioListener);
			if (this.captions)
			{
				this.captions.play(this._currentAudio);
				OS.instance.addUpdateCallback(ALIAS, this._updateCaptionPos);
			}
		}
	};
	
	/**
	*	Stops playback of any audio/timer.
	*	@method stop
	*	@public
	*/
	p.stop = function()
	{
		if (this._currentAudio && this._audioInst.isValid)
		{
			Audio.instance.stop();
			this._currentAudio = null;
		}
		if (this.captions)
		{
			this.captions.stop();
		}
		OS.instance.removeUpdateCallback(ALIAS);
		this.audioList = null;
		this._timer = 0;
		this._callback = null;
		var c = this._cancelledCallback;
		this._cancelledCallback = null;
		if (c) c();
	};

	/**
	*	Cleans up this VOPlayer.
	*	@method destroy
	*	@public
	*/
	p.destroy = function()
	{
		this.stop();
		this.audioList = null;
		this._listHelper = null;
		this._currentAudio = null;
		this._audioInst = null;
		this._callback = null;
		this._cancelledCallback = null;
		this._audioListener = null;

		if (this.captions)
		{
			this.captions.destroy();
			this.captions = null;
		}
	};
	
	// Assign to the global namespace
	namespace('cloudkid').VOPlayer = VOPlayer;
	namespace('cloudkid').Audio.VOPlayer = VOPlayer;
}());