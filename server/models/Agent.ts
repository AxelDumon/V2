import { Collection } from 'mongodb';

export class Agent {
	_id?: string;
	name: string;

	constructor(name: string, _id?: string) {
		if (_id) this._id = _id;
		this.name = name;
	}
}

let agentsCollection: Collection | undefined;

export function setAgentsCollection(collection: Collection) {
	agentsCollection = collection;
}

export function getAgentsCollection(): Collection {
	if (!agentsCollection) throw new Error('agentCollection not initialized');
	return agentsCollection;
}
