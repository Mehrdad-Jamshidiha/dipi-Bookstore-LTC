import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function disableBrowserZoom() {
  const preventGesture = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });

  document.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0')
    ) {
      event.preventDefault();
    }
  });
}

disableBrowserZoom();

createRoot(document.getElementById('root')!).render(<App />);
