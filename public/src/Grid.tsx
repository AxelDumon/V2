import Cell from './Cell';

type CellData = {
	valeur: number;
	agents?: string[];
};

type GridProps = {
	cellSize: number;
	tab: CellData[][];
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
						<Cell
							key={`${i}-${j}`}
							size={cellSize}
							crossingNumber={cell.valeur}
							agentId={
								cell.agents && cell.agents.length > 0
									? cell.agents[cell.agents.length - 1]
									: undefined
							}
						/>
					))}
				</div>
			))}
		</div>
	);
}
