import { render, screen } from '@testing-library/react';
import App from './App';

test('la app se renderiza sin errores', () => {
  render(<App />);
  // Puedes cambiar el texto según lo que muestre tu App
  expect(screen.getByText(/spotify/i)).toBeInTheDocument();
}); 