export class Cell {
	_id?: string;
	x: number;
	y: number;
	valeur: number;
	agents: string[];

	constructor(
		x: number,
		y: number,
		valeur = 0,
		agents: string[] = [],
		_id?: string
	) {
		this.x = x;
		this.y = y;
		this.valeur = valeur;
		this.agents = agents;
		if (_id) this._id = _id;
	}
}
