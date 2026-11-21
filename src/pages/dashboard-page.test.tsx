// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './dashboard-page';

describe('admin application shell', () => {
  it('shows the administration dashboard', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Administration dashboard' })).toBeTruthy();
  });
});
