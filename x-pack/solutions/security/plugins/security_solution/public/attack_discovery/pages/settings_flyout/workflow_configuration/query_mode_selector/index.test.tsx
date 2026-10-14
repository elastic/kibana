/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { QueryModeSelector } from '.';
import { TestProviders } from '../../../../../common/mock';

const defaultProps = {
  mode: 'custom_query' as const,
  onModeChange: jest.fn(),
};

describe('QueryModeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selector container', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeSelector')).toBeInTheDocument();
  });

  it('renders the Query builder mode button', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeQueryBuilderModeButton')).toBeInTheDocument();
  });

  it('renders the ES|QL mode button', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeEsqlModeButton')).toBeInTheDocument();
  });

  it('selects the Query builder mode button when mode is custom_query', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="custom_query" />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeQueryBuilderModeButton')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('does not select the ES|QL mode button when mode is custom_query', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="custom_query" />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeEsqlModeButton')).not.toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('selects the ES|QL mode button when mode is esql', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="esql" />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeEsqlModeButton')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not select the Query builder mode button when mode is esql', () => {
    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="esql" />
      </TestProviders>
    );

    expect(screen.getByTestId('queryModeQueryBuilderModeButton')).not.toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('calls onModeChange with esql when clicking the ES|QL mode button', async () => {
    const onModeChange = jest.fn();

    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="custom_query" onModeChange={onModeChange} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('queryModeEsqlModeButton'));

    expect(onModeChange).toHaveBeenCalledWith('esql');
  });

  it('calls onModeChange with custom_query when clicking the Query builder mode button', async () => {
    const onModeChange = jest.fn();

    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} mode="esql" onModeChange={onModeChange} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('queryModeQueryBuilderModeButton'));

    expect(onModeChange).toHaveBeenCalledWith('custom_query');
  });

  it('calls onModeChange exactly once per click', async () => {
    const onModeChange = jest.fn();

    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} onModeChange={onModeChange} mode="custom_query" />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('queryModeEsqlModeButton'));

    expect(onModeChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onModeChange on initial render', () => {
    const onModeChange = jest.fn();

    render(
      <TestProviders>
        <QueryModeSelector {...defaultProps} onModeChange={onModeChange} />
      </TestProviders>
    );

    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('renders with displayName', () => {
    expect(QueryModeSelector.displayName).toBe('QueryModeSelector');
  });
});
