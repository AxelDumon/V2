import { useEffect, useState } from 'react';
import Grid from './Grid';
import { SIZE } from '../config';
import { randInt, shuffle } from '../utils';

// Cache local des cases MongoDB
const cellsMap = new Map<string, string>(); // key: "x,y", value: MongoDB _id

async function fetchCells() {
	const res = await fetch('http://localhost:3001/api/cells');
	const cells = await res.json();
	cells.forEach((cell: any) => {
		cellsMap.set(`${cell.x},${cell.y}`, cell._id);
	});
	return cells;
}

async function saveCell(x: number, y: number, valeur: boolean) {
	const key = `${x},${y}`;
	const id = cellsMap.get(key);
	if (id) {
		await fetch(`http://localhost:3001/api/cells/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ valeur }),
		});
	} else {
		const res = await fetch('http://localhost:3001/api/cells', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ x, y, valeur }),
		});
		const cell = await res.json();
		cellsMap.set(key, cell._id);
	}
}

export default function App() {
	const [tab, setTab] = useState<number[][]>(() =>
		Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
	);

	useEffect(() => {
		fetchCells().then(data => {
			const newTab = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
			data.forEach((cell: any) => {
				newTab[cell.x][cell.y] = cell.valeur ? 1 : 0;
			});
			setTab(newTab);
		});
	}, []);

	async function clearGrid() {
		await fetch('http://localhost:3001/api/cells', {
			method: 'DELETE',
		});
		// Vide le cache local
		cellsMap.clear();
		// Réinitialise la grille
		setTab(Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
	}

	async function exploreGrid(startX = randInt(), startY = randInt()) {
		let tabCopy = tab.map(row => [...row]);
		let undiscoveredSet = new Set<string>();

		for (let i = 0; i < SIZE; i++) {
			for (let j = 0; j < SIZE; j++) {
				if (tabCopy[i][j] === 0) undiscoveredSet.add(`${i},${j}`);
			}
		}

		let x = startX;
		let y = startY;

		while (undiscoveredSet.size > 0) {
			if (tabCopy[x][y] > 0) {
				const arr = Array.from(undiscoveredSet);
				const idx = randInt(arr.length);
				[x, y] = arr[idx].split(',').map(Number);
				continue;
			}

			tabCopy[x][y] = 1;
			setTab(tab => {
				const copy = tab.map(row => [...row]);
				copy[x][y] = 1;
				return copy;
			});
			undiscoveredSet.delete(`${x},${y}`);
			saveCell(x, y, true); // Non bloquant
			await new Promise(resolve => setTimeout(resolve, 10));

			let found = false;
			for (const [dx, dy] of shuffle([
				[0, 1],
				[0, -1],
				[1, 0],
				[-1, 0],
				[1, 1],
				[1, -1],
				[-1, 1],
				[-1, -1],
			])) {
				const nx = x + dx;
				const ny = y + dy;
				if (
					nx >= 0 &&
					nx < SIZE &&
					ny >= 0 &&
					ny < SIZE &&
					tabCopy[nx][ny] === 0
				) {
					x = nx;
					y = ny;
					found = true;
					break;
				}
			}
			if (!found && undiscoveredSet.size > 0) {
				const arr = Array.from(undiscoveredSet);
				const idx = randInt(arr.length);
				[x, y] = arr[idx].split(',').map(Number);
			}
		}
	}

	return (
		<div
			className="container py-4"
			style={{ backgroundColor: '#383838ff', minHeight: '100vh' }}
		>
			<div className="mb-3 d-flex flex-row gap-2 justify-content-center">
				<button
					className="btn btn-primary"
					onClick={() => {
						if (tab.flat().some(c => c === 0)) {
							exploreGrid();
						}
					}}
				>
					Explorer
				</button>
				<button className="btn btn-danger" onClick={clearGrid}>
					Vider la grille
				</button>
			</div>
			<div className="mb-3 text-center">
				<span className="badge bg-light text-dark">
					Cases inexplorées restantes : {tab.flat().filter(c => c === 0).length}
				</span>
			</div>
			<div className="rounded p-3" style={{ backgroundColor: '#383838ff' }}>
				<Grid cellSize={20} tab={tab} />
			</div>
		</div>
	);
}
