import Cell from './Cell';
import { CellData } from '../types';

type GridProps = {
	cellSize: number;
	tab: CellData[][];
};

export default function Grid({ cellSize, tab }: GridProps) {
	console.log('Grid received tab:', tab);
	if (!tab || !Array.isArray(tab) || tab.length === 0) {
		return <div>No grid data available</div>;
	}

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
