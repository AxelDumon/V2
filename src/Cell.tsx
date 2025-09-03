type Props = {
	size: number;
	crossingNumber: number;
};

const background_colors: Record<number, string> = {
	0: 'white',
	1: 'darkgrey',
	2: 'gold',
	3: 'goldenrod',
	4: 'tomato',
	5: 'maroon',
};

export default function Cell({ size, crossingNumber }: Props) {
	return (
		<div
			className="cell"
			style={{
				width: `${size}px`,
				height: `${size}px`,
				backgroundColor: background_colors[crossingNumber] || 'maroon',
				color: crossingNumber > 0 ? 'white' : 'black',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: '1px solid #909090',
				fontSize: `${size * 0.6}px`,
			}}
		>
			{crossingNumber > 0 ? crossingNumber : ''}
		</div>
	);
}
