import React from 'react';

interface TimerProps {
	explorationTime: number;
}

const Timer: React.FC<TimerProps> = ({ explorationTime }) => {
	return (
		<div>
			<h2>Exploration Timer: {Math.floor(explorationTime / 1000)} seconds</h2>
		</div>
	);
};

export default Timer;
