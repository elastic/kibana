/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RefreshSection } from '.';

describe('RefreshSection', () => {
  const mockOnClose = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Refresh button', () => {
    render(<RefreshSection onClose={mockOnClose} onRefresh={mockOnRefresh} />);

    expect(screen.getByTestId('flyoutRefreshButton')).toBeInTheDocument();
  });

  it('renders the Refresh button with the correct label', () => {
    render(<RefreshSection onClose={mockOnClose} onRefresh={mockOnRefresh} />);

    expect(screen.getByTestId('flyoutRefreshButton')).toHaveTextContent('Refresh');
  });

  it('calls onRefresh when the Refresh button is clicked', async () => {
    render(<RefreshSection onClose={mockOnClose} onRefresh={mockOnRefresh} />);

    await userEvent.click(screen.getByTestId('flyoutRefreshButton'));

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Refresh button is clicked', async () => {
    render(<RefreshSection onClose={mockOnClose} onRefresh={mockOnRefresh} />);

    await userEvent.click(screen.getByTestId('flyoutRefreshButton'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
