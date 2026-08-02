/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PndCorrelationUnavailableState } from '.';

describe('PndCorrelationUnavailableState', () => {
  it('renders the correlation state', () => {
    render(<PndCorrelationUnavailableState />);

    expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument();
  });

  it('says the runs could not be found rather than implying nothing has happened yet', () => {
    render(<PndCorrelationUnavailableState />);

    expect(
      screen.getByText('Could not correlate this attack discovery to any run')
    ).toBeInTheDocument();
  });

  it('renders a retry action when a handler is supplied', () => {
    render(<PndCorrelationUnavailableState onRetry={jest.fn()} />);

    expect(screen.getByTestId('pndCorrelationUnavailableStateRetry')).toBeInTheDocument();
  });
});
