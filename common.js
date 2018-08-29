// Common script for AWS AI Services Chrome Extension
// Ceyhun OZGUN
// August 2018
// https://github.com/ceyhunozgun/awsAIChromeExtension

function errorToString(err) {
	var ret = '';
	
	if (err.code)
		ret += err.code + ' ';
	if (err.message)
		ret += err.message;
	if (ret == '')
		ret = err.toString();
	return ret;
}

function Uint8ToBase64(u8Arr){
	var CHUNK_SIZE = 0x8000;
	var index = 0;
	var length = u8Arr.length;
	var result = '';
	var slice;
	while (index < length) {
		slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length)); 
		result += String.fromCharCode.apply(null, slice);
		index += CHUNK_SIZE;
	}
	return btoa(result);
}

function base64ToByteArray(base64String) {
	var sliceSize = 1024;
	var byteCharacters = atob(base64String);
	var bytesLength = byteCharacters.length;
	var slicesCount = Math.ceil(bytesLength / sliceSize);
	var byteArrays = new Array(slicesCount);

	for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
		var begin = sliceIndex * sliceSize;
		var end = Math.min(begin + sliceSize, bytesLength);

		var bytes = new Array(end - begin);
		for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
			bytes[i] = byteCharacters[offset].charCodeAt(0);
		}
		byteArrays[sliceIndex] = new Uint8Array(bytes);
	}
	return byteArrays;
}

