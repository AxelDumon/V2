import { useState } from 'react';
import Grid from '../Grid';
import { SIZE } from '../config';
import { randInt, shuffle } from '../utils';

export default function App() {
	const [tab, setTab] = useState<boolean[][]>(
		Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
	);

	async function exploreGrid(startX = randInt(), startY = randInt()) {
		const newTab = tab.map(row => [...row]);
		const queue: [number, number][] = [[startX, startY]];
		const directions = [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		];

		while (queue.length > 0) {
			const [x, y] = queue.shift()!;
			if (newTab[x][y]) continue;
			await new Promise(resolve => setTimeout(resolve, 50));
			newTab[x][y] = true;
			setTab(tab => {
				const copy = tab.map(row => [...row]);
				copy[x][y] = true;
				return copy;
			});

			for (const [dx, dy] of shuffle(directions)) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && !newTab[nx][ny]) {
					queue.push([nx, ny]);
				}
			}
		}
	}

	return (
		<div>
			<button onClick={() => exploreGrid()}>Explorer</button>
			<Grid
				size={SIZE}
				cellSize={20}
				tab={tab.map(row => row.map(cell => (cell ? 1 : 0)))}
			/>
		</div>
	);
}
