import { useState } from 'react';
import Grid from './Grid';
import { SIZE } from '../config';
import { randInt, shuffle } from '../utils';

export default function App() {
	const [tab, setTab] = useState<number[][]>(() =>
		Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
	);

	async function exploreGrid(startX = randInt(), startY = randInt()) {
		let x = startX;
		let y = startY;
		const directions = [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		];

		// On garde la liste des cases non découvertes
		let remaining = SIZE * SIZE;
		let visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

		while (remaining > 0) {
			// Si la case courante est déjà découverte, on cherche une nouvelle case non découverte
			if (tab[x][y] > 0 || visited[x][y]) {
				const undiscovered: [number, number][] = [];
				for (let i = 0; i < SIZE; i++) {
					for (let j = 0; j < SIZE; j++) {
						if (tab[i][j] === 0 && !visited[i][j]) undiscovered.push([i, j]);
					}
				}
				if (undiscovered.length === 0) break;
				const [nx, ny] = undiscovered[randInt(undiscovered.length)];
				x = nx;
				y = ny;
				continue;
			}

			// Découvre la case courante
			setTab(tab => {
				const copy = tab.map(row => [...row]);
				copy[x][y] = 1;
				return copy;
			});
			visited[x][y] = true;
			remaining--;
			await new Promise(resolve => setTimeout(resolve, 50));

			// Cherche une case adjacente non découverte
			let found = false;
			for (const [dx, dy] of shuffle(directions)) {
				const nx = x + dx;
				const ny = y + dy;
				if (
					nx >= 0 &&
					nx < SIZE &&
					ny >= 0 &&
					ny < SIZE &&
					tab[nx][ny] === 0 &&
					!visited[nx][ny]
				) {
					x = nx;
					y = ny;
					found = true;
					break;
				}
			}

			// Si aucune case adjacente non découverte, on choisit une case non découverte au hasard
			if (!found) {
				const undiscovered: [number, number][] = [];
				for (let i = 0; i < SIZE; i++) {
					for (let j = 0; j < SIZE; j++) {
						if (tab[i][j] === 0 && !visited[i][j]) undiscovered.push([i, j]);
					}
				}
				if (undiscovered.length === 0) break;
				const [nx, ny] = undiscovered[randInt(undiscovered.length)];
				x = nx;
				y = ny;
			}
		}
	}

	return (
		<div>
			<button onClick={() => exploreGrid()}>Explorer</button>
			<div>
				Cases inexplorées restantes : {tab.flat().filter(c => c === 0).length}
			</div>
			<Grid cellSize={20} tab={tab} />
		</div>
	);
}
