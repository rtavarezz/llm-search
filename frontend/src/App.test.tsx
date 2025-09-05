import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Spice header', () => {
  render(<App />);
  const title = screen.getByText(/Spice/i);
  expect(title).toBeInTheDocument();
});
