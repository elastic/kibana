/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// src/components/get_started.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GetStarted } from './get_started';
import { useGetStarted } from './hooks/use_get_started';
import { TestProvider } from '../../test/test_provider';

jest.mock('./hooks/use_get_started', () => ({
  useGetStarted: jest.fn(),
}));

const mockGetStarted = {
  isEnabling: false,
  error: null,
  setError: jest.fn(),
  handleEnableClick: jest.fn(),
};

const renderWithProvider = (children: React.ReactNode) => {
  return render(<TestProvider>{children}</TestProvider>);
};

describe('GetStarted Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useGetStarted as jest.Mock).mockReturnValue(mockGetStarted);
  });

  it('renders the component', () => {
    renderWithProvider(<GetStarted />);

    expect(screen.getByText(/get started with asset inventory/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable asset inventory/i })).toBeInTheDocument();

    expect(screen.getByText(/read documentation/i)).toBeInTheDocument();
    expect(screen.getByText(/read documentation/i).closest('a')).toHaveAttribute(
      'href',
      'https://ela.st/asset-inventory'
    );
  });

  it('calls handleEnableClick when enable asset inventory button is clicked', () => {
    renderWithProvider(<GetStarted />);

    const button = screen.getByRole('button', { name: /enable asset inventory/i });
    fireEvent.click(button);

    expect(mockGetStarted.handleEnableClick).toHaveBeenCalled();
  });

  it('shows a loading spinner when enabling', () => {
    (useGetStarted as jest.Mock).mockReturnValue({
      ...mockGetStarted,
      isEnabling: true,
    });

    renderWithProvider(<GetStarted />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays an error message when there is an error', async () => {
    const errorMessage = 'Task Manager is not available';
    (useGetStarted as jest.Mock).mockReturnValue({
      ...mockGetStarted,
      error: errorMessage,
    });

    renderWithProvider(<GetStarted />);

    expect(screen.getByText(/sorry, there was an error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('dismisses error message when dismissed', async () => {
    (useGetStarted as jest.Mock).mockReturnValue({
      ...mockGetStarted,
      error: 'Task Manager is not available',
    });

    renderWithProvider(<GetStarted />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    await waitFor(() => expect(mockGetStarted.setError).toHaveBeenCalledWith(null));
  });
});
