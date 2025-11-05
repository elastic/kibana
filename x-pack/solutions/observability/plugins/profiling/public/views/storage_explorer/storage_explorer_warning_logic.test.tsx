/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiFlexItem } from '@elastic/eui';
import { DistinctProbabilisticValuesWarning } from './distinct_probabilistic_values_warning';

// Mock the profiling dependencies
jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    start: {
      core: {
        docLinks: {
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co',
          DOC_LINK_VERSION: 'current',
        },
      },
    },
  }),
}));

// Test component that mimics the storage explorer warning logic
function StorageExplorerWarningLogic({
  totalNumberOfDistinctProbabilisticValues,
}: {
  totalNumberOfDistinctProbabilisticValues: number;
}) {
  const hasDistinctProbabilisticValues = totalNumberOfDistinctProbabilisticValues > 1;

  return (
    <div>
      <div data-test-subj="warning-logic">
        {hasDistinctProbabilisticValues ? 'Warning should be shown' : 'Warning should be hidden'}
      </div>
      {hasDistinctProbabilisticValues && (
        <EuiFlexItem grow={false}>
          <DistinctProbabilisticValuesWarning
            totalNumberOfDistinctProbabilisticValues={totalNumberOfDistinctProbabilisticValues}
          />
        </EuiFlexItem>
      )}
    </div>
  );
}

describe('Storage Explorer Warning Logic', () => {
  it('shows warning when totalNumberOfDistinctProbabilisticValues > 1', () => {
    render(<StorageExplorerWarningLogic totalNumberOfDistinctProbabilisticValues={2} />);

    expect(screen.getByTestId('warning-logic')).toHaveTextContent('Warning should be shown');
    expect(
      screen.getByText(
        "We've identified 2 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();
  });

  it('shows warning when totalNumberOfDistinctProbabilisticValues = 3', () => {
    render(<StorageExplorerWarningLogic totalNumberOfDistinctProbabilisticValues={3} />);

    expect(screen.getByTestId('warning-logic')).toHaveTextContent('Warning should be shown');
    expect(
      screen.getByText(
        "We've identified 3 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();
  });

  it('does not show warning when totalNumberOfDistinctProbabilisticValues = 1', () => {
    render(<StorageExplorerWarningLogic totalNumberOfDistinctProbabilisticValues={1} />);

    expect(screen.getByTestId('warning-logic')).toHaveTextContent('Warning should be hidden');
    expect(
      screen.queryByText(/We've identified \d+ distinct probabilistic profiling values/)
    ).not.toBeInTheDocument();
  });

  it('does not show warning when totalNumberOfDistinctProbabilisticValues = 0', () => {
    render(<StorageExplorerWarningLogic totalNumberOfDistinctProbabilisticValues={0} />);

    expect(screen.getByTestId('warning-logic')).toHaveTextContent('Warning should be hidden');
    expect(
      screen.queryByText(/We've identified \d+ distinct probabilistic profiling values/)
    ).not.toBeInTheDocument();
  });

  it('does not show warning when totalNumberOfDistinctProbabilisticValues is negative', () => {
    render(<StorageExplorerWarningLogic totalNumberOfDistinctProbabilisticValues={-1} />);

    expect(screen.getByTestId('warning-logic')).toHaveTextContent('Warning should be hidden');
    expect(
      screen.queryByText(/We've identified \d+ distinct probabilistic profiling values/)
    ).not.toBeInTheDocument();
  });
});
