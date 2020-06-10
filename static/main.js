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
		this._audioContext = new AudioContext();
		this._handlers = {
			data: []
		};
		this._dataHandlers = this._handlers.data;
	}
	
	async start(sourceStream) {
		this._sourceStream = sourceStream;
		
		await this._audioContext.audioWorklet.addModule('audio_worklet.js');
		this._processorNode = new AudioWorkletNode(this._audioContext, "my-audio-processor");
		this._processorNode.port.onmessage = this._onMessage.bind(this);

		this._sourceNode = this._audioContext.createMediaStreamSource(sourceStream);
		await this.resume();
	}
	
	async suspend() {
		this._sourceNode.disconnect();
		await this._audioContext.suspend();
	}
	
	async resume() {
		this._sourceNode.connect(this._processorNode).connect(this._audioContext.destination);
		await this._audioContext.resume();
	}
	
	async close() {
		await this._audioContext.close();
	}
	
	get suspended() {
		return this._audioContext.state === 'suspended';
	}
	
	get running() {
		return this._audioContext.state === 'running';
	}
	
	get closed() {
		return this._audioContext.state === 'closed';
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
let spectrograph = new Spectrograph(document.querySelector('#spectrograph'), 32 * 10);
let audioProcessor;


document.querySelector("#start").onclick = async function (event) {
	event.preventDefault();
	this.style.display = 'none';

	if (!audioProcessor) {
		audioProcessor = await AudioProcessor.fromMic();
		
		audioProcessor.on("data", event => {
			power.setScale(event.rootMeanSquare * 1000);
			spectrograph.render(event.spectrograph, 100);
		});
	}
	
	await audioProcessor.resume();
	document.querySelector("#pause").style.display = 'block';
};

document.querySelector('#pause').onclick = async function (event) {
	event.preventDefault();
	this.style.display = 'none';
	
	await audioProcessor.suspend();
	document.querySelector("#start").style.display = 'block';
};


var _last_log = 0;
function throttle_log() {
	if (1 * new Date < _last_log + 1000) return;
	_last_log = 1 * new Date;
	
	console.log.apply(console.log, arguments);
}