/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PndErrorState } from '.';

describe('PndErrorState', () => {
  it('renders the error state', () => {
    render(<PndErrorState />);

    expect(screen.getByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('renders a default title', () => {
    render(<PndErrorState />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a caller-supplied title', () => {
    render(<PndErrorState title="Could not load runs" />);

    expect(screen.getByText('Could not load runs')).toBeInTheDocument();
  });

  it('renders the body', () => {
    render(<PndErrorState body="projection failed" />);

    expect(screen.getByText('projection failed')).toBeInTheDocument();
  });

  it('does not render a retry action when no handler is supplied', () => {
    render(<PndErrorState />);

    expect(screen.queryByTestId('pndErrorStateRetry')).not.toBeInTheDocument();
  });

  it('renders a retry action when a handler is supplied', () => {
    render(<PndErrorState onRetry={jest.fn()} />);

    expect(screen.getByTestId('pndErrorStateRetry')).toBeInTheDocument();
  });

  it('invokes the retry handler', async () => {
    const onRetry = jest.fn();
    render(<PndErrorState onRetry={onRetry} />);

    await userEvent.click(screen.getByTestId('pndErrorStateRetry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
