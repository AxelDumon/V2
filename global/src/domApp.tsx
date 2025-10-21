import React from 'react';
import ReactDOM from 'react-dom/client';
import Front from './Front';

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
root.render(
	<React.StrictMode>
		<Front />
	</React.StrictMode>
);
