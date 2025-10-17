// const background_colors: Record<number, string> = {
// 	0: 'white',
// 	1: 'darkgrey',
// 	2: 'gold',
// 	3: 'goldenrod',
// 	4: 'tomato',
// 	5: 'maroon',
// };

import { CellProps } from './type';

const agentColors: string[] = [
	'#3498db', // bleu
	'#e74c3c', // rouge
	'#2ecc71', // vert
	'#f1c40f', // jaune
	'#9b59b6', // violet
	'#e67e22', // orange
	'#1abc9c', // turquoise
	'#34495e', // gris foncé
	'#fd79a8', // rose
	'#00b894', // vert foncé
];

function getAgentColor(agentId?: string) {
	if (!agentId) return 'white';
	const idx = Number(agentId.toString().slice(-1)) % agentColors.length;
	// let hash = 0;
	// for (let i = 0; i < agentId.length; i++) {
	// 	hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
	// }
	// const idx = Math.abs(hash) % agentColors.length;
	return agentColors[idx];
}

export default function Cell({ size, agentId, crossingNumber }: CellProps) {
	return (
		<div
			className="cell"
			style={{
				width: `${size}px`,
				height: `${size}px`,
				backgroundColor: getAgentColor(agentId),
				color: crossingNumber && crossingNumber > 0 ? 'white' : 'black',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: '1px solid #909090',
				fontSize: `${size * 0.6}px`,
			}}
		>
			{crossingNumber && crossingNumber > 0 ? crossingNumber : ''}
		</div>
	);
}
