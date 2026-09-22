/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DecisionTreesTab } from './tab';
import { useDecisionTrees } from './use_decision_trees';
import type { ListDecisionTreesResponse } from './types';

jest.mock('./use_decision_trees');

const mockUseDecisionTrees = useDecisionTrees as jest.MockedFunction<typeof useDecisionTrees>;

const asQueryResult = (overrides: Record<string, unknown>) =>
  ({ isLoading: false, isError: false, data: undefined, ...overrides } as unknown as ReturnType<
    typeof useDecisionTrees
  >);

const response = (trees: ListDecisionTreesResponse['trees']): ListDecisionTreesResponse => ({
  trees,
  stats: {
    total: trees.length,
    established: trees.filter((tree) => tree.status === 'established').length,
    total_versions: trees.reduce((sum, tree) => sum + tree.version, 0),
  },
});

const renderTab = () =>
  render(
    <I18nProvider>
      <DecisionTreesTab />
    </I18nProvider>
  );

describe('DecisionTreesTab', () => {
  it('renders a loading spinner while fetching', () => {
    mockUseDecisionTrees.mockReturnValue(asQueryResult({ isLoading: true }));
    renderTab();
    expect(screen.getByTestId('nightshiftDecisionTreesLoading')).toBeInTheDocument();
  });

  it('renders an error prompt on failure', () => {
    mockUseDecisionTrees.mockReturnValue(asQueryResult({ isError: true }));
    renderTab();
    expect(screen.getByText('Could not load decision trees')).toBeInTheDocument();
  });

  it('renders the empty overview when there are no trees', () => {
    mockUseDecisionTrees.mockReturnValue(asQueryResult({ data: response([]) }));
    renderTab();
    expect(screen.getByTestId('nightshiftDecisionTreeEmpty')).toBeInTheDocument();
  });

  it('lists the trees in the overview', () => {
    mockUseDecisionTrees.mockReturnValue(
      asQueryResult({
        data: response([
          {
            tree_id: 'symptom:checkout-high-latency',
            symptom: 'checkout-high-latency',
            title: 'Checkout High Latency',
            status: 'established',
            version: 2,
            node_count: 5,
            edge_count: 4,
            learning_count: 1,
            updated_at: '2026-09-09T12:00:00.000Z',
          },
        ]),
      })
    );
    renderTab();
    expect(screen.getByTestId('nightshiftDecisionTreeHome')).toBeInTheDocument();
    // The title shows in both the sidebar list and the overview card.
    expect(screen.getAllByText('Checkout High Latency').length).toBeGreaterThan(0);
    expect(
      screen.getByTestId('nightshiftDecisionTreeCard-checkout-high-latency')
    ).toBeInTheDocument();
  });
});
