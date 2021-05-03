var mode = 0; //0 os and browser not supported, 1 use gamepad libary, 2 use serial 
var ballConnected = false;
var ball = 0;
var orbOutput = {x:0,y:0,z:0,rx:0,ry:0,rz:0};  //range -1 to 1;
var connectedToSerial = function temp(){};
var disconnectedToSerial = function temp(){};

window.addEventListener("gamepadconnected", (event) => {
	if(event.gamepad.id.includes("Tekuma") || event.gamepad.id.includes("ROV Control")){
		modeTest();
		connectToBall();
	}
});

function modeTest(){
	var canUseGame = "getGamepads" in navigator;
	var canUseSerial = "serial" in navigator;
	
	if(!canUseGame && !canUseSerial){
		mode = 0;
		return;
	}
	//known issue with chrome and windows not retrieving axis information correctly
	if(navigator.userAgent.includes("Windows") && navigator.userAgent.includes("Chrome")){
		if(canUseSerial){
			mode = 2;
		}
		else{
			mode = 0;
		}
		return mode;
	}
	else if(canUseGame){
		mode = 1;
		return 1;
	}
	else if(canUseSerial){
		mode = 2;
		return 2;
	}
}

function connectToBall(){
	switch(mode){
		case 0:
			break;
		case 1:
			useGamepadAPI();
			break;
		case 2:
			loadConnectStatement();
			break;
		default:
			break;
	}
}

var scanner;

function useGamepadAPI(){
	console.log("Using Gamepad API for demo");
	var gamePads = navigator.getGamepads();
	
	for(var i = 0; i < gamePads.length; i++){
		if(gamePads[i].id.includes("Tekuma") || gamePads[i].id.includes("ROV Control")){
			ball = gamePads[i];
			ballConnected = true;
			i = gamePads.length;
			
		}
	}
	
	if(ball == 0){
		return;
	}
	
	//start going the thing
	scanner = setInterval(gamepadConversion,5);
	
	window.addEventListener("gamepaddisconnected", (event) => {
		if(event.gamepad.id.includes("Tekuma")){
			//stop doing the thing
			clearInterval(scanner);
			ballConnected = false;
		}
	});
}

function gamepadConversion(){
	if(ballConnected){
		orbOutput.x = convertAxisToPercent(ball.axes[0]);
		orbOutput.y = convertAxisToPercent(ball.axes[1]);
		orbOutput.z = convertAxisToPercent(ball.axes[2]);
		orbOutput.rx = convertAxisToPercent(ball.axes[3]);
		orbOutput.ry = convertAxisToPercent(ball.axes[4]);
		orbOutput.rz = convertAxisToPercent(ball.axes[5]);
	}	
	else{
		orbOutput.x = 0;
		orbOutput.y = 0;
		orbOutput.z = 0;
		orbOutput.rx = 0;
		orbOutput.ry = 0;
		orbOutput.rz = 0;
	}
	//console.log(orbOutput);
}

function loadConnectStatement(){
	//todo, tell user they serial port must be used in this case
	
	
	//this is temp
	connectWithSerial();
}

const filtersSerail = [{usbVendorId: 0x03EB, usbProductId: 0x2062}];
var port;

var lineReader;
var reader;
var serialScanner;

function connectWithSerial(){
	
	promisedPort = navigator.serial.requestPort({filters: filtersSerail});
	
		
	promisedPort.then(
		(successMessage) => {
			console.log("Device connected over serial port");
			port = successMessage;
			var connection = port.open({baudRate:9600});
			//serialScanner = setInterval(passSerialToBallData,1);
			connection.then(
				(successMessage) => {
					reader = port.readable.getReader();
					connectedToSerial();
					serialRead();
				
				},
				(failMessage) => {
					disconnectedToSerial();
					console.log("Device has either been disconnected or an error occured");
				}
			);
		},
		(failMessage) => {
			disconnectedToSerial();
			console.log("Device has either been disconnected or an error occured");
	}
	);
		
}

var passingArray = [];

var d = new Date();
var pastTime = d.getTime();

function serialRead(){

	try {
		const string = reader.read();
		string.then(
			(successMessage) => {
				var tempArray = successMessage.value;
				tempArray.forEach(appendNewData);
				if(port.readable){
					serialRead();
				}
				
				passSerialToBallData();
			},
			(failMessage) => {
				disconnectedToSerial();
				console.log("Device has either been disconnected or an error occured");
			}		
		);
	} catch (error) {
		//console.log(e);
	}
}

function appendNewData(data, index, array){
	passingArray.push(data);
}

function convertAxisToPercent(axis){
	var ax = Math.round((axis)*10000)/10000;
	if(ax < 0.005 && ax > -0.005){
		ax = 0;
	}
	return ax;
}

function passSerialToBallData(){
	while(passingArray.length >= 13){
		
		var splitArray = new Uint8Array(13);
		for(var i = 0; i < 13; i++){
			splitArray[i] = passingArray.shift();
		}	
		var convertArray = new Int16Array(6);
		if(splitArray[12] == 0){
			for(var i = 0; i < 12; i += 2){
				convertArray[i/2] = (splitArray[i+1]<<8) + splitArray[i];
			}
		}	
		

		orbOutput.x = convertAxisToPercent(convertArray[0]/32766);
		orbOutput.y = convertAxisToPercent(convertArray[1]/32766);
		orbOutput.z = convertAxisToPercent(convertArray[2]/32766);
		orbOutput.rx = convertAxisToPercent(convertArray[3]/32766);
		orbOutput.ry = convertAxisToPercent(convertArray[4]/32766);
		orbOutput.rz = convertAxisToPercent(convertArray[5]/32766);
		//console.log(splitArray);		
		//console.log(convertArray);
	}
}
