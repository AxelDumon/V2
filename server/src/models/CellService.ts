import { CouchDB } from '../utils/CouchDB.js';
import { CellDocument } from '../utils/types.js';

export class CellService {
	public static SIZE: number = Number(process.env.SIZE);
	public static designDocId: string = 'cell_views';

	static async deleteAll() {
		try {
			this.getAllCells().then(cells => {
				const bulkDelete = cells.map(cell => ({
					_id: cell._id,
					_rev: cell._rev,
					_deleted: true,
				}));
				if (bulkDelete.length > 0) {
					CouchDB.bulkDocs(bulkDelete);
				}
			});
		} catch (error) {
			console.error(
				`[${CellService.deleteAll.name}] Error deleting all cells:`,
				error
			);
			throw error;
		}
	}

	static async countCells(): Promise<number> {
		try {
			const cells = await CouchDB.findView(CellService.designDocId, 'by_cells');
			if (cells && cells.total_rows !== undefined) {
				return cells.total_rows;
			}
			return 0;
		} catch (error) {
			console.error(
				`[${CellService.countCells.name}] Error counting cells:`,
				error
			);
			return 0;
		}
	}

	static async getRandomUndiscoverdCell(): Promise<CellDocument | null> {
		try {
			const undiscoveredCells = await CouchDB.findView(
				CellService.designDocId,
				'by_undiscovered_cells',
				{ include_docs: 'true' }
			);

			if (undiscoveredCells.total_rows === 0) {
				console.log(
					`[${CellService.getRandomUndiscoverdCell.name}] No undiscovered cells found.`
				);
				return null;
			}

			const randomIndex = Math.floor(
				Math.random() * undiscoveredCells.total_rows
			);
			const cellData: CellDocument = undiscoveredCells.rows[randomIndex]
				.doc as CellDocument;

			return cellData;
		} catch (error) {
			console.error(
				`[${CellService.getRandomUndiscoverdCell.name}] Error fetching undiscovered cell:`,
				error
			);
			return null;
		}
	}

	static async getAllCells(): Promise<CellDocument[]> {
		try {
			const allDocs = await CouchDB.findView(
				CellService.designDocId,
				'by_cells',
				{ include_docs: 'true' }
			);
			console.log(
				`[${CellService.getAllCells.name}] Fetched ${allDocs.total_rows} cells from DB.`
			);
			if (allDocs.total_rows === 0) return [];
			return allDocs.rows.map(row => row.doc as CellDocument);
		} catch (error) {
			console.error(
				`[${CellService.getAllCells.name}] Error fetching all cells:`,
				error
			);
			return [];
		}
	}

	static async getUndiscoveredNeighbors(
		x: number,
		y: number
	): Promise<CellDocument[]> {
		try {
			const startkey = [Math.max(0, x - 1), Math.max(0, y - 1)];
			const endkey = [
				Math.min(CellService.SIZE - 1, x + 1),
				Math.min(CellService.SIZE - 1, y + 1),
			];
			const neighbors = await CouchDB.findView(
				CellService.designDocId,
				'undiscovered_neighbors',
				{
					startkey: JSON.stringify(startkey),
					endkey: JSON.stringify(endkey),
				}
			);

			const filteredNeighbors = neighbors.rows
				.map(row => row.value)
				.filter(cell => {
					const dx = Math.abs(cell.x - x);
					const dy = Math.abs(cell.y - y);
					return (
						(dx === 1 && dy === 0) ||
						(dx === 0 && dy === 1) ||
						(dx === 1 && dy === 1)
					);
				});

			return filteredNeighbors;
		} catch (error) {
			console.error(
				`[${CellService.getUndiscoveredNeighbors.name}] Error fetching undiscovered neighbors:`,
				error
			);
			return [];
		}
	}

	static async initGrid() {
		const bulk: CellDocument[] = [];
		for (let i = 0; i < CellService.SIZE; i++) {
			for (let j = 0; j < CellService.SIZE; j++) {
				bulk.push({
					_id: `${i}-${j}`,
					type: 'cell',
					x: i,
					y: j,
					valeur: 0,
					agents: [],
				});
			}
		}
		await fetch(`${CouchDB.dbUrl}/_bulk_docs`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: CouchDB.authHeader,
			},
			body: JSON.stringify({ docs: bulk }),
		});
		console.log(
			`[${CellService.initGrid.name}]Grille initialisée (${bulk.length} cases)`
		);
		return bulk.length;
	}

	static async findOne(x: number, y: number): Promise<CellDocument | null> {
		try {
			const response = await CouchDB.findView(
				CellService.designDocId,
				'by_cells',
				{ include_docs: 'true' },
				[[x, y]]
			);

			if (response.total_rows === 0) {
				console.log(
					`[${CellService.findOne.name}] No cell found at coordinates (${x}, ${y}).`
				);
				return null;
			}

			return response.rows[0].doc as CellDocument;
		} catch (error) {
			console.error(`[${CellService.findOne.name}] Error finding cell:`, error);
			return null;
		}
	}

	static async incrementValue(
		cellId: string,
		agentName: string
	): Promise<CellDocument> {
		try {
			const data = await CouchDB.callUpdateHandler(
				'cell_updates',
				'reserve_cell',
				cellId,
				{},
				{ agent: agentName }
			).catch(error => {
				console.error(
					`[${CellService.incrementValue.name}] Error calling update handler`
				);
				throw error;
			});
			if (data && 'doc' in data) return data.doc as CellDocument;
			else {
				console.log(`[${CellService.incrementValue.name}] No doc returned`);
				throw new Error('No doc returned from update handler');
			}
		} catch (error) {
			console.error(
				`[${CellService.incrementValue.name}] Error incrementing cell value:`,
				error
			);
			throw error;
		}
	}

	static async reserveAndUpdate(
		cellId: string,
		agentName: string
	): Promise<void> {
		const url = `${CouchDB.dbUrl}/_design/cell_updates/_update/reserve_cell/${cellId}`;

		try {
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					Authorization: CouchDB.authHeader,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ agent: agentName }),
			});

			if (!response.ok) {
				throw new Error(
					`[${CellService.reserveAndUpdate.name}] Failed to reserve cell: ${response.statusText}`
				);
			}

			console.log(
				`[${CellService.reserveAndUpdate.name}] Cell reserved successfully.`
			);
		} catch (error) {
			console.error(
				`[${CellService.reserveAndUpdate.name}] Error reserving cell:`,
				error
			);
			throw error;
		}
	}
}
