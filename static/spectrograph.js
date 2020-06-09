class Spectrograph {
	constructor(element, dotCount) {
		this.element = element;
		this.dotCount = dotCount;
		this.dots = [];
		for (let i = 0; i < dotCount; ++i) {
			let dot = document.createElement('div');
			element.appendChild(dot);
			dot.className = 'spectrograph-dot';
			dot.style.left = (100 * (i + 0.5) / dotCount) + '%';
			dot.style.position = 'absolute';
			let circle = new Circle(dot);
			this.dots.push(circle);
		}
	}
	
	render(array, scale) {
		for (let i = 0; i < Math.min(array.length, this.dotCount); ++i) {
			this.dots[i].setScale(array[i] * scale);
		}
	}
}