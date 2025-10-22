export interface CellData {
	valeur: number;
	agents?: string[];
}
export interface CellDTO {
	x: number;
	y: number;
	valeur: number;
	_id: string;
}
export interface CellProps {
	size: number;
	agentId?: string;
	crossingNumber?: number;
}
export interface AgentStatusData {
	name: string;
	service: string;
	online: boolean;
	lastSeen: number;
}
// export type CellData = {
// 	valeur: number;
// 	agents?: string[];
// };
