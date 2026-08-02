/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { PndQueryState } from '.';

const defaultProps = {
  emptyTitle: 'No proposals',
  error: null,
  isEmpty: false,
  isLoading: false,
};

const CHILD_TEST_ID = 'pndQueryStateChild';

const children = <div data-test-subj={CHILD_TEST_ID}>{'rows'}</div>;

describe('PndQueryState', () => {
  it('renders children when there is nothing to report', () => {
    render(<PndQueryState {...defaultProps}>{children}</PndQueryState>);

    expect(screen.getByTestId(CHILD_TEST_ID)).toBeInTheDocument();
  });

  it('renders the loading state while the query is in flight', () => {
    render(
      <PndQueryState {...defaultProps} isLoading>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('does not render children while loading', () => {
    render(
      <PndQueryState {...defaultProps} isLoading>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId(CHILD_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders "Workflows unavailable" for a 503, not an empty state', () => {
    render(
      <PndQueryState {...defaultProps} error={createHttpFetchError({ status: 503 })} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('does not render the empty state for a 503', () => {
    render(
      <PndQueryState {...defaultProps} error={createHttpFetchError({ status: 503 })} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId('pndEmptyState')).not.toBeInTheDocument();
  });

  it('renders the error state for a 500', () => {
    render(
      <PndQueryState {...defaultProps} error={createHttpFetchError({ status: 500 })} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('does NOT render the empty state for a 500, which is a broken read rather than an empty queue', () => {
    render(
      <PndQueryState {...defaultProps} error={createHttpFetchError({ status: 500 })} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId('pndEmptyState')).not.toBeInTheDocument();
  });

  it('renders the error state for a transport failure', () => {
    render(
      <PndQueryState {...defaultProps} error={createHttpFetchError()}>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('surfaces the route’s own message in the error state', () => {
    render(
      <PndQueryState
        {...defaultProps}
        error={createHttpFetchError({ body: { message: 'projection failed' }, status: 500 })}
      >
        {children}
      </PndQueryState>
    );

    expect(screen.getByText('projection failed')).toBeInTheDocument();
  });

  it('renders the Attack Discovery workflows disabled state on an empty response with the header false', () => {
    render(
      <PndQueryState {...defaultProps} isAttackDiscoveryWorkflowsEnabled={false} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndAttackDiscoveryDisabledState')).toBeInTheDocument();
  });

  it('names the per-space ui setting in the disabled state, so the reader knows what to turn on', () => {
    render(
      <PndQueryState {...defaultProps} isAttackDiscoveryWorkflowsEnabled={false} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByText('securitySolution:enableAttackDiscoveryWorkflows')).toBeInTheDocument();
  });

  it('does not render the disabled state when the response was not empty', () => {
    render(
      <PndQueryState {...defaultProps} isAttackDiscoveryWorkflowsEnabled={false}>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId('pndAttackDiscoveryDisabledState')).not.toBeInTheDocument();
  });

  it('renders the ordinary empty state when the feature is enabled and there is nothing to show', () => {
    render(
      <PndQueryState {...defaultProps} isAttackDiscoveryWorkflowsEnabled isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('renders the empty title', () => {
    render(
      <PndQueryState {...defaultProps} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.getByText('No proposals')).toBeInTheDocument();
  });

  it('does not render children when empty', () => {
    render(
      <PndQueryState {...defaultProps} isEmpty>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId(CHILD_TEST_ID)).not.toBeInTheDocument();
  });

  it('prefers loading over an empty response so a first paint never flashes "nothing here"', () => {
    render(
      <PndQueryState {...defaultProps} isEmpty isLoading>
        {children}
      </PndQueryState>
    );

    expect(screen.queryByTestId('pndEmptyState')).not.toBeInTheDocument();
  });
});
