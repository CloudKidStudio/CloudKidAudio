$(function(){
	
	// Imports
	var SwishSprite = cloudkid.SwishSprite,
		Audio = cloudkid.Audio,
		Application = cloudkid.Application,
		OS = cloudkid.OS;
	
	if (/[0-9\.]+/.test(document.location.host))
	{
		Debug.connect(document.location.host);
	}

	// We aren't actually using the canvas or application, 
	// but we need to create and OS so that the update
	// will be available to cloudkid.Audio
	OS.init("stage");
	OS.instance.addApp(new Application());
	
	/**
	*  Load the JSON data
	*/
	$.getJSON("sounds/pizzaplaceaudio.json", function(data){
		
		Audio.init(data);

		var aliases = $("#aliases"), sprite, priority;
		for(var alias in data.spritemap)
		{
			sprite = data.spritemap[alias];
			priority = sprite.priority ? 'priority' + sprite.priority : '';
			aliases.append('<li><button data-alias="' + alias + 
				'" class="alias disabled ' + priority + 
				'" disabled>'+alias+'</button></li>');
		}
		
		// Make the button clickable
		// a user event (like click) is needed in order
		// to start loading the audio on iOS and Android
		$("#load")
			.removeAttr('disabled')
			.removeClass('disabled')
			.click(function(){
				$(this).attr('disabled', true).off('click');
				Audio.instance.load(onAudioLoaded);
			});
	});
					
	/**
	*  The audio has finished loading
	*/
	var onAudioLoaded = function(){

		$('body').removeClass('unloaded');

		$(".alias")
			.removeAttr('disabled')
			.removeClass('disabled')
			.click(function(){
				Audio.instance.play($(this).data('alias'));
		});
		$(".control")
			.removeAttr('disabled')
			.removeClass('disabled')
			.click(function(){
				Audio.instance[$(this).data('action')]();
		});
	};
});