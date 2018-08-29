// AWS AI Services helper for AWS AI Services Chrome Extension
// Ceyhun OZGUN
// August 2018
// https://github.com/ceyhunozgun/awsAIChromeExtension

var AWSAIServices = (function() {
	
	var polly;
	var rekognition;
	var translate;

	var voices = {
		'en': 'Joanna',
		'es': 'Penelope',
		'tr': 'Filiz',
		'fr': 'Lea',
		'de': 'Vicki',
		'it': 'Carla'
	};

	function initAWS(accessKeyId, secretAccessKey, region) {
		AWS.config.region = region;
		AWS.config.accessKeyId = accessKeyId;
		AWS.config.secretAccessKey = secretAccessKey;
	}

	function initPolly(region) {
		polly = new AWS.Polly({ region: region});
	}

	function initRekognition(region) {
		rekognition = new AWS.Rekognition({ region: region});
	}

	function initTranslate(region) {
		translate = new AWS.Translate({ region: region});
	}

	function synthesizeSpeech(txt, lang, callback) {
		lang = lang || 'en';
		var params = {
			OutputFormat: 'mp3',
			Text: txt,
			VoiceId: voices[lang]
		};
		
		polly.synthesizeSpeech(params, function(err, data) {
			if (err)
				callback(err, null);
			else
				callback(null, data.AudioStream);
		});		
	}

	function translateText(txt, sourceLangCode, targetLangCode, callback) {
		var params = {
			Text: txt,
			SourceLanguageCode: sourceLangCode,
			TargetLanguageCode: targetLangCode,
		};
		translate.translateText(params, function (err, data) {
			if (err) 
				callback(err, data);
			else
				callback(null, data.TranslatedText);
		});
	}

	function detectTextInImage(blob, callback) {
		var arrayBuffer;
		var fileReader = new FileReader();
		
		fileReader.onload = function() {
			var arrayBuffer = this.result;
			var params = {
				Image: {
					Bytes: arrayBuffer
				}
			};
			rekognition.detectText(params, function(err, data) {
				if (err) {
					console.log(err, err.stack);
					callback(err, null);
				}
				else {
					var text = '';
					for (var i = 0; i < data.TextDetections.length; i++) {
						var td = data.TextDetections[i];
						if (td.Type == "LINE")
							text += td.DetectedText + "\n";
					}
					callback(null, text);
				}		
			});
		};
		fileReader.readAsArrayBuffer(blob);
	}

	function initAWSServices(key, secret, region) {
		initAWS(key, secret, region);
		initPolly(region);
		initRekognition(region);
		initTranslate(region);
	}

	return {
		// Initialization services
		init: function(key, secret, region) {
			initAWSServices(key, secret, region);
		},
		
		// Polly services
		synthesizeSpeech : function (txt, lang, callback) {
			synthesizeSpeech(txt, lang, callback);
		},

		// Translate services
		translateText : function(txt, sourceLangCode, targetLangCode, callback) {
			translateText(txt, sourceLangCode, targetLangCode, callback);
		},
		
		// Rekognition services
		detectTextInImage : function (blob, callback) {
			detectTextInImage(blob, callback);
		}
	};
})();