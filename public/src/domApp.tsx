import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.querySelector('.appContainer')!);
root.render(<App />);
