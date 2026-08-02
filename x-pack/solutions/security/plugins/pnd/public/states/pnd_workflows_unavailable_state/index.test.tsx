/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PndWorkflowsUnavailableState } from '.';

describe('PndWorkflowsUnavailableState', () => {
  it('renders the unavailable state', () => {
    render(<PndWorkflowsUnavailableState />);

    expect(screen.getByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('says workflows are unavailable rather than implying there is nothing to do', () => {
    render(<PndWorkflowsUnavailableState />);

    expect(screen.getByText('Workflows unavailable')).toBeInTheDocument();
  });

  it('renders a retry action when a handler is supplied', () => {
    render(<PndWorkflowsUnavailableState onRetry={jest.fn()} />);

    expect(screen.getByTestId('pndWorkflowsUnavailableStateRetry')).toBeInTheDocument();
  });

  it('does not render a retry action without a handler', () => {
    render(<PndWorkflowsUnavailableState />);

    expect(screen.queryByTestId('pndWorkflowsUnavailableStateRetry')).not.toBeInTheDocument();
  });
});
