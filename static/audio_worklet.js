import * as fft from './fft.js'


class MyAudioProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this._lastUpdate = 0;
		this._memory = []; // [highest octave compressed, ..., lowest octave compressed]
		this._averages = []; // [highest octave spectrograph, ..., lowest octave spectrograph]
		this._octaves = 10;
		for (let i = 0; i < this._octaves; ++i) {
			this._memory.push(null);
			this._averages.push(null);
		}
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
		
		this.updateMemory(input);
		
		let quarter_samples = input.length >> 2;
		let spectrograph = new Float32Array(this._octaves * quarter_samples);
		
		for (let octave = 0; octave < this._octaves; ++octave) {
			let octave_averages = this._averages[octave];
			if (octave_averages) {
				spectrograph.set(this._averages[octave], octave * quarter_samples);
			}
		}
		
		let sum_of_squares = 0;
		for (let i = 0; i < spectrograph.length; ++i) {
			sum_of_squares += spectrograph[i] * spectrograph[i];
		}
		let root_mean_square = Math.sqrt(sum_of_squares / spectrograph.length);
		
		this.throttlePostMessage(updateIntervalSeconds, {
			rootMeanSquare: root_mean_square,
			spectrograph: spectrograph
		});
		return true;
	}
	
	updateMemory(input) {
		let samples = input.length;
		for (let octave = 0; octave < this._octaves; ++octave) {
			// Transform the input.
			// Transform is shaped like [low frequencies ... high ... low]
			let transform = fft.FFT(input);
			let half_samples = samples >> 1;
			let quarter_samples = half_samples >> 1;
			let three_quarter_samples = quarter_samples + half_samples;

			// Split the transformed input in half by frequency:
			// - High frequencies get converted into a spectrograph.
			// - Low frequencies get converted back into a signal, downsampled by half.
			
			// Extract high frequencies into a spectrograph.
			// Discard the first half of the samples when computing the spectrograph,
			// since they are identical to the second half of samples. (Since we transformed
			// a real signal, the transform is symmetric.)
			let high_freq_spectrograph = new transform.ArrayType(quarter_samples);
			for (let i = 0; i < quarter_samples; ++i) {
				let real = transform.real[half_samples + i];
				let imag = transform.imag[half_samples + i];
				high_freq_spectrograph[i] = Math.sqrt(real * real + imag * imag);
			}

			// Update the averages for this octave based on the spectrograph.
			if (!this._averages[octave]) {
				this._averages[octave] = high_freq_spectrograph;
			} else {
				let octave_average = this._averages[octave];
				for (let i = 0; i < quarter_samples; ++i) {
					octave_average[i] = Math.max(
						0.5 * octave_average[i] + 0.5 * high_freq_spectrograph[i],
						high_freq_spectrograph[i]
					);
				}
			}
			
			// If this is the last octave, we can skip the rest, which just prepares for the
			// next iteration.
			if (octave === this._octaves - 1) break;
			
			// Extract low frequencies into a new transform.
			let low_freq_transform = new fft.ComplexArray(half_samples);
			low_freq_transform.real.set(transform.real.subarray(0, quarter_samples), 0);
			low_freq_transform.imag.set(transform.imag.subarray(0, quarter_samples), 0);
			low_freq_transform.real.set(transform.real.subarray(three_quarter_samples), quarter_samples);
			low_freq_transform.imag.set(transform.imag.subarray(three_quarter_samples), quarter_samples);

			// Convert the low frequencies back into a downsampled signal.
			// Discard the imaginary part, since the downsampled signal should be real (the
			// imaginary part should be all zeros anyway, up to rounding errors).
			let downsampled = fft.InvFFT(low_freq_transform).real;
			
			if (!this._memory[octave]) {
				// If we don't have an existing downsampled signal at this octave to combine with,
				// just store the current downsampled signal and stop iterating.
				this._memory[octave] = downsampled;
				break;
			} else {
				// If we do have an existing downsampled signal at this octave, concatenate it with
				// the current downsampled signal and process this as the input for the next octave.
				input = new transform.ArrayType(samples);
				input.set(this._memory[octave], 0);
				input.set(downsampled, half_samples);
				// Clear the memory at this octave.
				this._memory[octave] = null;
			}
		}
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
		
		this.port.postMessage(message);
	}
}


registerProcessor('my-audio-processor', MyAudioProcessor);
