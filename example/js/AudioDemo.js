(function(undefined) {
	
	if (Audio)
	{
		Debug.log("We already have an audio class");
	}
	
	// Imports
	var OS = cloudkid.OS,
		Animator = cloudkid.Animator,
		Audio = cloudkid.Audio,
		AudioAnimation = cloudkid.AudioAnimation,
		Application = cloudkid.Application,
		Ticker = createjs.Ticker,
		DOMElement = createjs.DOMElement;
	
	/**
	*  This application demonstrates the functionality of the 
	*  cloudkid.Audio class library. Includes AudioAnimations
	*  as well as basic playback, pausing, muting of sprite sounds
	*  @class AudioDemo
	*/
	var AudioDemo = function()
	{
		this.initialize();
	}
	
	/** Extend the createjs container */
	var p = AudioDemo.prototype = new Application(),
	
	/** Reference to the stage */
	_stage,
	
	/** Test character animation clip */
	_chick = null,
	
	/** The initial size of the chick animation */
	_chickSize = {width:120, height:220},
	
	/** The DOM object of the ui */
	_ui = null,
	
	/** The audio animation */
	_syncedAnim = null,
	
	/** The looping audio animation */
	_syncedLoopAnim = null,
	
	/** The infinitely looping audio animation */
	_syncedLoop4Eva = null,
	
	/** The current animation selected */
	_currentAnimation = null,
	
	/** Instance of cloudkid.Audio */
	_audio = null,
	
	/** The start button */
	_startButton = null;
	
	/** The name of this application */
	p.name = "AudioDemo";
	
	/**
	* Called by the OS when the application is ready
	*/
	p.init = function()
	{
		_stage = OS.instance.stage;
		
		// Set for animation
		Ticker.setFPS(24);
		
		// Grab the chick from the library
		_chick = new lib.Chick;
		_chick.name = "CHICKEN";
		_chick.stop();
		this.addChild(_chick);	
		
		// center
		_chick.x = (_stage.canvas.width - _chickSize.width) * 0.85;
		_chick.y = (_stage.canvas.height - _chickSize.height) / 2;
		_chick.loop = false;
		
		Animator.useFrameDropping = true;
		
		_startButton = $("#start_container");
		var domElement = new DOMElement(_startButton.get(0));
		this.addChild(domElement);
		_startButton.hide();
		
		_audio = Audio.init("sounds/output.json", onReady);
	}
	
	/**
	*  Callback when the sound singleton is ready
	*/
	function onReady()
	{
		Debug.log("Audio is ready. Click on the button to load (required for iOS).");
		
		_startButton.show();
		_startButton.click(_startButtonPressed);
	}
	
	/**
	*  When the start button is pressed
	*  iOS needs to load the sound on a user input
	*/
	function _startButtonPressed()
	{
		_startButton.hide();
		_audio.load(spriteFullyLoaded);
	}
	
	function spriteFullyLoaded()
	{		
		_syncedAnim = new AudioAnimation(_chick, "GoodJob", "jump", 1, 5);
		_syncedLoopAnim = new AudioAnimation(_chick, "crazyApples", "jump", 3);
		_syncedLoop4Eva = new AudioAnimation(_chick, "crazyApples", "jump", 0);
		
		// Create the DOM element for the ui
		_ui = new DOMElement($("#ui").get(0));
		_stage.addChildAt(_ui, 0);
		
		$("#ui").show();
		
		$("#ui button").click(function(e){
			e.preventDefault();
			var action = $(this).attr('data-action');
			switch(action)
			{
				case "sync" :
					_syncedAnim.play(function(){
						Debug.log("Sync animation done called");
					});
					_currentAnimation = _syncedAnim;
					break;
				case "syncLoop" : 
					_syncedLoopAnim.play();
					_currentAnimation = _syncedLoopAnim;
					break;
				case "syncLoop4Eva" : 
					_syncedLoop4Eva.play();
					_currentAnimation = _syncedLoop4Eva;
					break;
				case "pauseAni" : 
					if(_currentAnimation)
					{
						_currentAnimation.pause();
					}
					break;
				case "resumeAni" : 
					if(_currentAnimation)
					{
						_currentAnimation.resume();
					}
					break;
				case "stopAni" : 
					if(_currentAnimation)
					{
						_currentAnimation.stop();
						_chick.gotoAndStop(0);
					}
					_currentAnimation = null;
					break;	
				case "pauseSnd" : 
					_audio.pause(); 
					break;
				case "resumeSnd" : 
					_audio.resume();
					break;
				case "stopSnd" : 
					_audio.stop();
					break;
				case 'mute' :
					_audio.mute();
					break;
				case 'unmute' :
					_audio.unmute();
					break;
				
				default :
					_audio.play(action)
					break;
			}
		});
	}
	
	/**
	*  Destroy this app, don't use after this
	*/
	p.destroy = function()
	{
		if (_syncedAnim) _syncedAnim.destroy();
		if (_syncedLoopAnim) _syncedLoopAnim.destroy();
		if (_syncedLoop4Eva) _syncedLoop4Eva.destroy();
		
		_syncedAnim = null;
		_syncedLoopAnim = null;
		_syncedLoop4Eva = null;
		
		_audio.destroy();
		
		_ui = null;
		
		$("#ui").hide();
		$("#ui a").unbind("click");
		
		upClip = null;
		downClip = null;
		
		this.removeAllChildren();
		_stage = null;
	};
	
	namespace('cloudkid').AudioDemo = AudioDemo;
}());