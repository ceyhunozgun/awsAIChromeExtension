// Content script for AWS AI Services Chrome Extension
// Ceyhun OZGUN
// August 2018
// https://github.com/ceyhunozgun/awsAIChromeExtension


(function() {
	
	var clickedElement;
	var pollyPreferences;
	var translatePreferences;

	document.addEventListener("contextmenu", function(event){
		clickedElement = event.target;
	}, true);
	
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {		
		chrome.runtime.sendMessage(
			{	op: 'getStatus' },
			function (resp) {
				if (resp.data.status === 'OK') {
					pollyPreferences = resp.data.pollyPreferences;
					translatePreferences = resp.data.translatePreferences;
					processContextMenu(request, sendResponse);
				}
				else
					alert('AWS AI Services Extension is not ready. Status: ' + resp.data.status);
			}
		);
	});

	function processContextMenu(request, sendResponse) {
		if (request.op === 'readSelection')
			selectionReader.readSelection(request.selectedText);
		else if (request.op === 'translateSelection')
			translator.translateSelection(request.selectedText);
		else if (request.op === 'setAuthyToken')
			authyTokenReader.readAuthyTokenAndSet(clickedElement);
		else if (request.op === 'detectTextFromImgElement')
			textDetectorFromImgElement.detectTextFromImgElement(clickedElement);	
	}
	
	var speaker = (function() {
		function playAudioFromUrl(url, finishHandler) {
			var audio = new Audio(url);
			audio.onended = function() {
				if (finishHandler)
					finishHandler();
			}
			audio.play();
		}

		return {
			speak: function(txt, lang, callback) {
				chrome.runtime.sendMessage(
					{
						op: 'synthesizeSpeech',
						lang: lang,
						text: txt
					},
					function (resp) {
						if (resp.data) {
							var base64 = resp.data;
							var uInt8Array = base64ToByteArray(base64);
							var blob = new Blob(uInt8Array);
							var url = URL.createObjectURL(blob);
							
							playAudioFromUrl(url, callback);
						}	
						else
							callback(err);
					}
				);
			}
		}
	})();
	
	var selectionReader = (function(speaker) {
		
		var readSelectionDialog;

		function speak() {
			var lang = $("#awsAIExt_speechLang").val();
			var txt = $("#awsAIExt_speechText").val();
			
			speaker.speak(txt, lang, function (err) {
				if (err)
					alert('Error when connecting to Polly: ' + errorToString(err));
			});
		}
		
		return {
			readSelection: function (txt) {
				if (readSelectionDialog == null) {
					readSelectionDialog = document.createElement('div');
					$(readSelectionDialog).load(chrome.extension.getURL("speak.html") + " #awsAIExt_speak", function () { 
						$(readSelectionDialog).dialog({
							title: "Read Text Using Amazon Polly",
							width: 450,
							create: function (event, ui) {
								$('#awsAIExt_speakText').attr('src', chrome.extension.getURL($('#awsAIExt_speakText').attr('src')));
								$('#awsAIExt_speakText').click(speak);
								$("#awsAIExt_speechText").val(txt);
							},
							open: function (event, ui) {
								if (pollyPreferences && pollyPreferences.lang)
									$("#awsAIExt_speechLang").val(pollyPreferences.lang);
								speak();
							}
						});
					});
				}
				else {
					$("#awsAIExt_speechText").val(txt);
					$(readSelectionDialog).dialog("open");
				}	
			}	
		};
	})(speaker);
	
	var translator = (function(speaker) {
		var translateDialog;

		function playInputText() {
			var inputLang = $("#awsAIExt_inputLang").val();
			var txt = $("#awsAIExt_inputText").val();

			speaker.speak(txt, inputLang, function (err) {
				if (err)
					alert('Error when connecting to Polly: ' + errorToString(err));
			});
		}

		function playOutputText() {
			var outputLang = $("#awsAIExt_outputLang").val();
			var txt = $("#awsAIExt_outputText").val();

			speaker.speak(txt, outputLang, function (err) {
				if (err)
					alert('Error when connecting to Polly: ' + errorToString(err));
			});
		}

		function checkLanguages(inputLang, outputLang) {
			if (inputLang === outputLang) {
				alert('Please choose different languages as source and target language');
				return false;
			}
			if (inputLang != 'en' && outputLang != 'en') {
				alert('Please choose English as either source language or target language');
				return false;
			}
			return true;
		}

		function translate() {
			var inputLang = $("#awsAIExt_inputLang").val();
			var outputLang = $("#awsAIExt_outputLang").val();
			var txt = $("#awsAIExt_inputText").val();
			
			if (!checkLanguages(inputLang, outputLang))
				return;
			
			chrome.runtime.sendMessage(
				{
					op: 'translateText',
					sourceLangCode: inputLang,
					targetLangCode: outputLang,
					text: txt
				},
				function (resp) {
					if (resp.err)
						alert('Error when connecting to Translate: ' + errorToString(err));
					else {
						$("#awsAIExt_outputText").val(resp.data);
						playOutputText();
					}
				}
			);		
		}
		
		return {
			translateSelection: function (txt) {
				if (translateDialog == null) {
					translateDialog = document.createElement('div');
					$(translateDialog).load(chrome.extension.getURL("translate.html") + " #awsAIExt_translate", function () { 
						$(translateDialog).dialog({
							title: "Translate Using Amazon Translate",
							width: 450,
							create: function (event, ui) {
								$('#awsAIExt_translateBtn').click(translate);
								$('#awsAIExt_speakInp').attr('src', chrome.extension.getURL($('#awsAIExt_speakInp').attr('src')));
								$('#awsAIExt_speakInp').click(playInputText);
								$('#awsAIExt_speakOut').attr('src', chrome.extension.getURL($('#awsAIExt_speakOut').attr('src')));
								$('#awsAIExt_speakOut').click(playOutputText);
								$("#awsAIExt_inputText").val(txt);
							},
							open: function (event, ui) {
								if (translatePreferences && translatePreferences.sourceLangCode && translatePreferences.targetLangCode) {
									$("#awsAIExt_inputLang").val(translatePreferences.sourceLangCode);
									$("#awsAIExt_outputLang").val(translatePreferences.targetLangCode);
								}
								translate();
							}
						});
					});
				}
				else {
					$("#awsAIExt_inputText").val(txt);
					$(translateDialog).dialog("open");
				}
			}
		};
	})(speaker);

	var imageCapturer = (function () {

		var videoSource;
		var video;
		var canvas;
		var imageCaptureStatus;
		
		var width;
		var height;

		var streaming = false;
		
		function setImageCaptureStatus(txt) {
			imageCaptureStatus.innerText = txt;
		}
		
		function initImageCapture(parentDiv, wdth, hght, initCallback, videoClickedCallback, canvasClickedCallback) {
			
			width = wdth;
			height = hght;
			
			videoSource = document.createElement('select');
			video = document.createElement('video');
			video.style.border = "1px solid black";

			canvas = document.createElement('canvas');
			canvas.style.border = "1px solid red";
			
			video.addEventListener('canplay', function(ev){
				if (!streaming) {
			
					video.setAttribute('width', width);
					video.setAttribute('height', height);
					canvas.setAttribute('width', width);
					canvas.setAttribute('height', height);

					streaming = true;
				}
			}, false);
			
			video.addEventListener('click', videoClickedCallback);
			canvas.addEventListener('click', canvasClickedCallback);
			
			var constraints = {
				audio: false,
				video: true
			};
					
			navigator.mediaDevices.getUserMedia(constraints).then(function onSuccess(stream) {
				video.srcObject = stream;
				video.play();
				setImageCaptureStatus('Ready');
				initCallback();
			});
			
			imageCaptureStatus = document.createElement('p');
			
			if (parentDiv) {
				
				var clickVideo = document.createElement('p');
				clickVideo.innerHTML = 'Click video to capture picture';
				parentDiv.appendChild(clickVideo);
				
				parentDiv.appendChild(video);
				
				canvas.style.display = 'none';
				parentDiv.appendChild(canvas);
				
				parentDiv.appendChild(imageCaptureStatus);
			}
		}

		function captureImage(callback) {
			var context = canvas.getContext('2d');
			
			if (width && height) {
				canvas.width = width;
				canvas.height = height;
				context.drawImage(video, 0, 0, width, height);
				
				canvas.toBlob(function (blob) {
					setImageCaptureStatus('Image captured');
					callback(blob);
				});
			}
		}
		
		
		return {
			init: initImageCapture,
			capture: captureImage,
			hideCanvas: function () {
				canvas.style.display = 'none';
			},
			showCanvas: function () {
				canvas.style.display = 'inline';
			},
			hideVideo: function () {
				video.style.display = 'none';
			},
			showVideo: function () {
				video.style.display = 'inline';
			},
		};
		
	})();
	
	var authyTokenReader = (function(imageCapturer) {
		
		var readAuthyTokenDialog;
				
		function extractAuthyCode(str) {
			const regex = /(\d{6})|(\d{3})\s*(\d{3})/;
			let m;
			var res = [];

			if ((m = regex.exec(str)) !== null) {
				m.forEach((match, groupIndex) => {
					res.push(match);
				});
			}
			var extracted = '';
			if (res && res.length == 4) {
				if (res[1])
					extracted = res[1];
				else
					extracted = res[2] + res[3];
			}
			return extracted;
		}

		function detectTextInImage(blob, callback) {
			var fileReader = new FileReader();
			fileReader.onload = function(event) {
				var arrayBuffer = event.target.result;
				chrome.runtime.sendMessage(
					{
						op: 'detectTextInImage',
						data: Uint8ToBase64(new Uint8Array(arrayBuffer)),
					},
					function (resp) {
						callback(resp.err, resp.data);
					}
				);

			};
			fileReader.readAsArrayBuffer(blob);
		};
		
		return {
			readAuthyTokenAndSet: function(elementToSetValue) {
				if (readAuthyTokenDialog == null) {
					readAuthyTokenDialog = document.createElement('div');
					$(readAuthyTokenDialog).load(chrome.extension.getURL("readAuthyToken.html") + " #awsAIExt_readAuthyToken", function () { 
						$(readAuthyTokenDialog).dialog({
							title: "Read Authy Code Using Rekognition",
							width: 450,
							create: function (event, ui) {
								imageCapturer.init(document.getElementById('awsAIExt_readAuthyTokenVideoCapturer'), 320, 240, 
									function () {
									},
									function () {
										imageCapturer.capture(function (blob) {
											imageCapturer.hideVideo();
											imageCapturer.showCanvas();
											detectTextInImage(blob, function (err, txt) {
												if (err)
													alert('Error when connecting to Rekognition: ' + errorToString(err));
												else {
													$("#awsAIExt_extractedText").val(txt);
													
													var code = extractAuthyCode(txt);

													if (code !== '') {
														$("#awsAIExt_result").html('Code extracted: ' + code);
														elementToSetValue.value = code;
														$(readAuthyTokenDialog).dialog("close");
													}
													else
														$("#awsAIExt_result").html("Couldn't extract code");
												}	
											});
										});
									},
									function () {
										imageCapturer.hideCanvas();
										imageCapturer.showVideo();
									}
								);
						
							},
							open: function (event, ui) {
								imageCapturer.hideCanvas();
								imageCapturer.showVideo();
							}
						});
					});
				}
				else {
					$(readAuthyTokenDialog).dialog("open");
				}
			}
		};
	})(imageCapturer);

	var textDetectorFromImgElement = (function() {
		
		var detectTextDialog;
		var imgElement;
				
		function detectTextInImage(blob, callback) {
			var fileReader = new FileReader();
			fileReader.onload = function(event) {
				var arrayBuffer = event.target.result;
				chrome.runtime.sendMessage(
					{
						op: 'detectTextInImage',
						data: Uint8ToBase64(new Uint8Array(arrayBuffer)),
					},
					function (resp) {
						callback(resp.err, resp.data);
					}
				);

			};
			fileReader.readAsArrayBuffer(blob);
		}
		
		function drawImgToCanvas(img, naturalWidth, naturalHeight, canvas) {
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			var cw = canvas.width;
			var ch = canvas.height;
			var w = naturalWidth;
			var h = naturalHeight;
			if (w < cw && h < ch)
				ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
			else {
				if (w > h) {
					var dh = h * cw / w;
					ctx.drawImage(img, 0, (ch - dh) / 2, cw, dh);
				}
				else {
					var dw = w * ch / h;
					ctx.drawImage(img, (cw - dw) / 2, 0, dw, ch);
				}
			}
		}
		
		function loadImage(url, callback) {
			var img = document.getElementById('awsAIExt_detectTextImage');
			img.setAttribute('crossOrigin', 'anonymous');
			img.onload = function() {
				callback(this);
			};
			img.src = url;
		}
		
		function loadImageWithXhr(url, callback) {
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
			if (xhr.readyState==4 && xhr.status==200) {
				var blob = new Blob([xhr.response], {
					type: xhr.getResponseHeader("Content-Type")
				});
				var imgUrl = window.URL.createObjectURL(blob);
				//var img = new Image();
				var img = document.getElementById('awsAIExt_detectTextImage');
				img.src = imgUrl;
				callback(img);
			  }
			}
			xhr.responseType = "arraybuffer";
			xhr.open("GET", url, true);

			xhr.send();
  		}
		
		return {
			detectTextFromImgElement: function(imgElm) {
				imgElement = imgElm;
				if (detectTextDialog == null) {
					detectTextDialog = document.createElement('div');
					$(detectTextDialog).load(chrome.extension.getURL("textDetectorFromImgElement.html") + " #awsAIExt_detectTextFromImgElement", function () { 
						$(detectTextDialog).dialog({
							title: "Detect Text from Image Using Rekognition",
							width: 560,
							create: function (event, ui) {
							},
							open: function (event, ui) {
								var canvas = document.getElementById('awsAIExt_detectTextCanvas');
							
								loadImageWithXhr(imgElement.src, function (img) {
									setTimeout(function() { 
										drawImgToCanvas(img, imgElement.naturalWidth, imgElement.naturalHeight, canvas);
										try {
											canvas.toBlob(function (blob) {
												detectTextInImage(blob, function (err, txt) {
													if (err)
														alert('Error when connecting to Rekognition: ' + errorToString(err));
													else {
														$("#awsAIExt_detectedText").val(txt);
													}	
												});
											});
										}
										catch (err) {
											$("#awsAIExt_detectedText").val("Error: " + errorToString(err));
										}
									}, 100);
								});
							}
						});
					});
				}
				else {
					$(detectTextDialog).dialog("open");
				}
			}
		};
	})();
	
})();