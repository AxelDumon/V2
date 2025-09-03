import { JSX } from 'react';
import Cell from './Cell';
import { GridProps } from './type';

export default function Grid({ size, cellSize, tab }: GridProps) {
	const cells: JSX.Element[] = [];
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			cells.push(
				<Cell key={`${i}-${j}`} size={cellSize} crossingNumber={tab[i][j]} />
			);
		}
	}
	return (
		<div className="grid">
			{tab.map((row, i) => (
				<div className="grid-row" key={i} style={{ display: 'flex' }}>
					{row.map((cell, j) => (
						<Cell key={`${i}-${j}`} size={cellSize} crossingNumber={cell} />
					))}
				</div>
			))}
		</div>
	);
}
