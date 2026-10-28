import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ArtPreview } from './ArtPreview';
import './styles.css';
import './hud.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const showArt = new URLSearchParams(window.location.search).has('art');

createRoot(root).render(
  <StrictMode>{showArt ? <ArtPreview /> : <App />}</StrictMode>,
);
