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

export type AgentStat = {
	_id: string;
	name: string;
	count: number;
	duration: number | null;
};

export type CellProps = {
	size: number;
	agentId?: string;
	crossingNumber?: number;
};
