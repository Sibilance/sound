class Circle {
	constructor(element) {
		this.element = element;
		element.style.borderRadius = '50%';
		element.style.display = 'inline-block';
		this.setScale(1);
	}
	
	setScale(area) {
		const radius = Math.sqrt(area);
		this.element.style.transform = 'translate(-50%, -50%) scale(' + radius + ')';
	}
}