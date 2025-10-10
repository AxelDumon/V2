import { createRoot } from 'react-dom/client';
import App from './v2/App';

const root = createRoot(document.querySelector('.appContainer')!);
root.render(<App />);
