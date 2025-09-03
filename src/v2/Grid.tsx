import Cell from '../Cell';

type GridProps = {
	cellSize: number;
	tab: number[][];
};

export default function Grid({ cellSize, tab }: GridProps) {
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
