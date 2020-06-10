import * as fft from './fft.js'


class MyAudioProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this._lastUpdate = 0;
	}
	
	static get parameterDescriptors() {
		return [{
			name: 'updateIntervalSeconds',
			defaultValue: 0.02,
			minValue: 0
		}]
	}
	
	process(inputList, outputList, parameters) {
		const input = inputList[0][0];
		const updateIntervalSeconds = parameters.updateIntervalSeconds[0];
		
		let sum_of_squares = 0;
		for (let i = 0; i < input.length; ++i) {
			sum_of_squares += input[i] * input[i];
		}
		let root_mean_square = Math.sqrt(sum_of_squares / input.length);
		
		let transform = fft.FFT(input);
		//throttle_log('transform', sampleRate, currentTime, transform);
		let spectrograph = new transform.ArrayType(transform.length);
		for (let i = 0; i < transform.length; ++i) {
			spectrograph[i] = Math.sqrt(transform.real[i] * transform.real[i] + transform.imag[i] * transform.imag[i]);
		}
		
		this.throttlePostMessage(updateIntervalSeconds, {
			rootMeanSquare: root_mean_square,
			spectrograph: spectrograph
		});
		return true;
	}
	
	throttlePostMessage(updateIntervalSeconds, message) {
		if (currentTime < this._lastUpdate + updateIntervalSeconds) {
			// If it hasn't been updateIntervalSeconds since the last update, it is too
			// soon to send another update.
			return;
		}
		if (currentTime < this._lastUpdate + 1.5 * updateIntervalSeconds) {
			// If we missed the target interval by only a little bit, pretend we didn't.
			this._lastUpdate += updateIntervalSeconds;
		} else {
			// If we missed the target interval by too much, accurately record when we last updated.
			this._lastUpdate = currentTime;
		}
		
		console.log('sent message', message);
		this.port.postMessage(message);
	}
}


registerProcessor('my-audio-processor', MyAudioProcessor);
