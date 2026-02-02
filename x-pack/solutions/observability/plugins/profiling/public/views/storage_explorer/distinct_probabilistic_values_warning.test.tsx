/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('DistinctProbabilisticValuesWarning', () => {
  it('shows warning when totalNumberOfDistinctProbabilisticValues > 1', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={2} />);

    expect(
      screen.getByText(
        "We've identified 2 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();

    expect(screen.getByText('Learn how')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn how' })).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/observability/current/profiling-probabilistic-profiling.html'
    );
  });

  it('shows warning with correct count for multiple values', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={5} />);

    expect(
      screen.getByText(
        "We've identified 5 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();
  });

  it('shows warning when totalNumberOfDistinctProbabilisticValues = 1', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={1} />);

    expect(
      screen.getByText(
        "We've identified 1 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();
  });

  it('shows warning when totalNumberOfDistinctProbabilisticValues = 0', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={0} />);

    expect(
      screen.getByText(
        "We've identified 0 distinct probabilistic profiling values. Make sure to update them."
      )
    ).toBeInTheDocument();
  });

  it('displays the description text', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={2} />);

    expect(
      screen.getByText(
        'We recommend using a consistent probabilistic value for each project for more efficient storage, cost management, and to maintain good statistical accuracy.'
      )
    ).toBeInTheDocument();
  });

  it('has correct test subject for learn how button', () => {
    render(<DistinctProbabilisticValuesWarning totalNumberOfDistinctProbabilisticValues={2} />);

    expect(
      screen.getByTestId('profilingDistinctProbabilisticValuesWarningLearnHowButton')
    ).toBeInTheDocument();
  });
});
