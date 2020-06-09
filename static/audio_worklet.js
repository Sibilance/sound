import * as fft from './fft.js'


class MyAudioProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
	}
	
	process(inputList, outputList, parameters) {
		const input = inputList[0][0];
		
		let sum_of_squares = 0;
		for (let i = 0; i < input.length; ++i) {
			sum_of_squares += input[i] * input[i];
		}
		let root_mean_square = Math.sqrt(sum_of_squares / input.length);
		
		let transform = fft.FFT(input);
		throttle_log('transform', transform);
		let spectrograph = new transform.ArrayType(transform.length);
		for (let i = 0; i < transform.length; ++i) {
			spectrograph[i] = Math.sqrt(transform.real[i] * transform.real[i] + transform.imag[i] * transform.imag[i]);
		}
		
		this.port.postMessage({
			rootMeanSquare: root_mean_square,
			spectrograph: spectrograph
		});
		return true;
	}
}


registerProcessor('my-audio-processor', MyAudioProcessor);


var _last_log = 0;
function throttle_log() {
	if (1 * new Date < _last_log + 1000) return;
	_last_log = 1 * new Date;
	
	console.log.apply(console.log, arguments);
}