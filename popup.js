// Popup script for AWS AI Services Chrome Extension
// Ceyhun OZGUN
// August 2018
// https://github.com/ceyhunozgun/awsAIChromeExtension


function loadCredentials() {
	chrome.runtime.sendMessage(
		{
			op: 'getCredentials',
			dataKey: 'awsCredentials'
		},
		function (data) {
			if (data.awsCredentials) {
				$('#awsAccessKeyId').val(data.awsCredentials.awsAccessKeyId);
				$('#awsSecretAccessKey').val(data.awsCredentials.awsSecretAccessKey);
				$('#awsRegion').val(data.awsCredentials.awsRegion);
			}
		}
	);
}

function checkCredentials(callback) {
	chrome.runtime.sendMessage(
		{
			op: 'synthesizeSpeech',
			voice: 'Joanna',
			text: 'Welcome'
		},
		function (resp) {
			callback(resp.err, resp.data);
		}
	);
}

function saveCredentials() {
	var awsAccessKeyId = $('#awsAccessKeyId').val();
	var awsSecretAccessKey = $('#awsSecretAccessKey').val();
	var awsRegion = $('#awsRegion').val();
		
	if (awsAccessKeyId !== '' && awsSecretAccessKey !== '' && awsRegion !== '') {
		chrome.runtime.sendMessage({
			op: 'saveCredentials',
			data: {
				awsCredentials: {
					awsAccessKeyId: $('#awsAccessKeyId').val(),
					awsSecretAccessKey: $('#awsSecretAccessKey').val(),
					awsRegion: $('#awsRegion').val()
				}
			}
		}, function (resp) {
			if (resp.err)
				alert('Error when testing credentials: ' + errorToString(resp.err));
			else {
				alert('Credentials validated and saved. You can use the extension on pages.');
				window.close();
			}
		});
	}
	else
		alert('Please enter your credentials');
}

$(function() {
	var regions = [
		"eu-west-1",
		"eu-west-2",
		"eu-west-3",
		"eu-central-1",
		"us-west-1",
		"us-west-2",
		"us-east-1",
		"us-east-2"
    ];
    $("#awsRegion").autocomplete({
      source: regions
    });
	
	$('#saveBtn').click(saveCredentials);
	$('#loadBtn').click(loadCredentials);

	loadCredentials();
});
