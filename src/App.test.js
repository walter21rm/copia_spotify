import { render, screen } from '@testing-library/react';
import App from './App';

test('la app se renderiza sin errores', () => {
  render(<App />);
  expect(screen.getByText(/bienvenido a musicplayer/i)).toBeInTheDocument();
}); 