export type GridProps = {
	size: number;
	cellSize: number;
	tab: number[][];
};

export type CellDTO = {
	x: number;
	y: number;
	valeur: number;
	_id: string;
};

export type AgentStat = { _id: string; count: number };

export type CellProps = {
	size: number;
	agentId?: string;
	crossingNumber?: number;
};
