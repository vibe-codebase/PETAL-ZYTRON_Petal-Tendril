import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-700-italic.css';
import '@fontsource/karla/latin-500.css';
import '@fontsource/karla/latin-600.css';
import '@fontsource/karla/latin-700.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
