$(function(){
	
	// Imports
	var SwishSprite = cloudkid.SwishSprite;
	
	if (/[0-9\.]+/.test(document.location.host))
	{
		Debug.connect(document.location.host);
	}
	
	var loadButton = $("#load");
	var playbar = $("#playbar").hide();
	var audio = null;
	
	/**
	*  Load the JSON data
	*/
	$.getJSON("sounds/pizzaplaceaudio.json", function(data){
		
		var aliases = $("#aliases");
		for(var alias in data.spritemap)
		{
			aliases.append('<li><button data-alias="'+alias+'" class="alias disabled" disabled>'+alias+'</button></li>');
		}
		
		loadButton
			.removeAttr('disabled')
			.removeClass('disabled')
			.click(function(){

				// Disable the laod button
				var loadButton = $(this).attr('disabled', true).off('click');

				// Create the new audio sprite
				audio = new SwishSprite(data);

				// Add listener for the Loaded event
				audio.on(SwishSprite.LOAD_STARTED, onAudioLoaded);

				// User load
				audio.load();
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
				playbar.show().width("0%");
				audio.off(SwishSprite.PROGRESS)
					.on(SwishSprite.PROGRESS, function(p){
						playbar.width(Math.round(p*100)+"%");
					})
					.play($(this).data('alias'));
		});
		$(".control")
			.removeAttr('disabled')
			.removeClass('disabled')
			.click(function(){
				audio[$(this).data('action')]();
		});
	};
});