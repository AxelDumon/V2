import Cell from '../Cell';

type GridProps = {
	cellSize: number;
	tab: number[][];
};

export default function Grid({ cellSize, tab }: GridProps) {
	return (
		<div
			className="grid d-flex flex-column align-items-center justify-content-center w-100"
			style={{ backgroundColor: '#383838ff' }}
		>
			{tab.map((row, i) => (
				<div className="grid-row d-flex" key={i} style={{}}>
					{row.map((cell, j) => (
						<Cell key={`${i}-${j}`} size={cellSize} crossingNumber={cell} />
					))}
				</div>
			))}
		</div>
	);
}
