// Background script for AWS AI Services Chrome Extension
// Ceyhun OZGUN
// August 2018
// https://github.com/ceyhunozgun/awsAIChromeExtension

(function() {
	
	var status;
	var pollyPreferences;
	var translatePreferences;

	var readSelectionMenuId = chrome.contextMenus.create({
	  "title": "Read Selected Text Using Amazon Polly",
	  "contexts": ["selection"]
	});

	var translateSelectionMenuId = chrome.contextMenus.create({
	  "title": "Translate Selected Text Using Amazon Translate",
	  "contexts": ["selection"]
	});

	var setAuthyTokenMenuId = chrome.contextMenus.create({
	  "title": "Set Authy Token From Camera Using Amazon Rekognition",
	  "contexts": ["editable"]
	});
	
	var detectTextFromImgElementMenuId = chrome.contextMenus.create({
	  "title": "Detect Text Using Amazon Rekognition",
	  "contexts": ["image"]
	});

	chrome.contextMenus.onClicked.addListener(function (info, tab) {
		if (info.menuItemId == readSelectionMenuId)
			chrome.tabs.sendMessage(tab.id, {op: 'readSelection', selectedText: info.selectionText});
		else if (info.menuItemId == translateSelectionMenuId)
			chrome.tabs.sendMessage(tab.id, {op: 'translateSelection', selectedText: info.selectionText});
		else if (info.menuItemId == setAuthyTokenMenuId)
			chrome.tabs.sendMessage(tab.id, {op: 'setAuthyToken'});
		else if (info.menuItemId == detectTextFromImgElementMenuId)
			chrome.tabs.sendMessage(tab.id, {op: 'detectTextFromImgElement'});
	});

	chrome.runtime.onInstalled.addListener(function() {
	});

	chrome.runtime.onMessage.addListener( function (message, sender, sendResponse) {
		if (message.op === 'saveCredentials' ) {
			checkAWSCredentials(message.data.awsCredentials, function (err, data) {
				if (err)
					sendResponse({err: err, data: data});
				else
					chrome.storage.sync.set(message.data, function() { 
						sendResponse({});
					});
			});
			return true;
		}
		else if (message.op === 'getCredentials' ) {
			chrome.storage.sync.get(message.dataKey, 
				function(data) {
					sendResponse(data);
				}
			);
			return true;
		}
		else if (message.op === 'getStatus') {
			sendResponse({ 
				data: { 
					status: status,
					pollyPreferences: pollyPreferences,
					translatePreferences: translatePreferences
				}
			});
			return true;
		}
		else if (message.op === 'synthesizeSpeech' ) {
			storePollyPreferences(message.lang);
			AWSAIServices.synthesizeSpeech(message.text, message.lang, function (err, audioStream) {
				var uInt8Array = new Uint8Array(audioStream);

				sendResponse({ err: err, data: Uint8ToBase64(uInt8Array)});
			});
			return true;
		}
		else if (message.op === 'detectTextInImage' ) {
			var base64 = message.data;
			var uInt8Array = base64ToByteArray(base64);
			var blob = new Blob(uInt8Array);
						
			AWSAIServices.detectTextInImage(blob, function (err, txt) {
				sendResponse({ err: err, data: txt});
			});
			return true;
		}
		else if (message.op === 'translateText' ) {
			storeTranslatePreferences(message.sourceLangCode, message.targetLangCode);
			AWSAIServices.translateText(message.text, message.sourceLangCode, message.targetLangCode, function (err, txt) {
				sendResponse({ err: err, data: txt});
			});
			return true;
		}
	});
	
	function storePollyPreferences(lang) {
		pollyPreferences = { lang: lang };
		chrome.storage.sync.set({pollyPreferences: pollyPreferences});
	}

	function storeTranslatePreferences(srcLangCode, trgtLangCode) {
		translatePreferences = { sourceLangCode: srcLangCode, targetLangCode: trgtLangCode};
		chrome.storage.sync.set({translatePreferences: translatePreferences});
	}


	function checkAWSCredentials(awsCredentials, callback) {
		AWSAIServices.init(awsCredentials.awsAccessKeyId, awsCredentials.awsSecretAccessKey, awsCredentials.awsRegion);
		AWSAIServices.synthesizeSpeech('Welcome', 'en', function(err, data) {
			if (err)
				callback(err, null);
			else {
				status = 'OK';
				callback(null, data);
			}
		});
	}

	function initAWSCredentials() {
		chrome.storage.sync.get('awsCredentials', function(data) {
				var awsCredentials = data.awsCredentials;
				
				if (awsCredentials && awsCredentials.awsAccessKeyId !== '' && awsCredentials.awsSecretAccessKey !== '' && awsCredentials.awsRegion !== '') {
					AWSAIServices.init(awsCredentials.awsAccessKeyId, awsCredentials.awsSecretAccessKey, awsCredentials.awsRegion);
					status = 'OK';
					chrome.storage.sync.get('pollyPreferences', function(res) {
						pollyPreferences = res.pollyPreferences;
					});
					chrome.storage.sync.get('translatePreferences', function(res) {
						translatePreferences = res.translatePreferences;
					});
				}
				else
					status = 'Not configured AWS Credentials. Please configure.';
			}
		);
	}

	function startExtension() {
		if (!chrome.storage) {
			setTimeout(startExtension, 1000);
			return;
		}
		initAWSCredentials();
	}

	setTimeout(startExtension, 1000);
})();
