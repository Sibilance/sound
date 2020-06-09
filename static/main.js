class AudioProcessor {
	static async fromMic() {
		let micStream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false
		});
		
		let audioProcessor = new this();
		await audioProcessor.start(micStream);
		
		return audioProcessor;
	}
	
	constructor(sourceStream) {
		this._handlers = {
			data: []
		};
		this._dataHandlers = this._handlers.data;
	}
	
	async start(sourceStream) {
		let audioContext = new AudioContext();
		await audioContext.resume();
		let sourceNode = audioContext.createMediaStreamSource(sourceStream);
		
		await audioContext.audioWorklet.addModule('audio_worklet.js');

		let processorNode = new AudioWorkletNode(audioContext, "my-audio-processor");
		sourceNode.connect(processorNode);
		// If it isn't connected to a destination, the worklet is not executed.
		processorNode.connect(audioContext.destination);
		
		processorNode.port.onmessage = this._onMessage.bind(this);
	}
	
	on(eventName, handler) {
		let handlerList = this._handlers[eventName];
		if (!handlerList) throw "unknown event type: " + eventName;
		
		handlerList.push(handler);
	}
	
	_onMessage(event) {
		const data = event.data;
		for (let handler of this._dataHandlers) {
			handler(data);
		}
	}
}


let power = new Circle(document.querySelector('#power'));
let spectrograph = new Spectrograph(document.querySelector('#spectrograph'), 128);


document.querySelector("#start").onclick = async function (event) {
	event.preventDefault();
	this.parentElement.removeChild(this);
	
	let audioProcessor = await AudioProcessor.fromMic();
	
	audioProcessor.on("data", event => {
		power.setScale(event.rootMeanSquare * 1000);
		spectrograph.render(event.spectrograph, 100);
		throttle_log('data', event);
	});
};


var _last_log = 0;
function throttle_log() {
	if (1 * new Date < _last_log + 1000) return;
	_last_log = 1 * new Date;
	
	console.log.apply(console.log, arguments);
}