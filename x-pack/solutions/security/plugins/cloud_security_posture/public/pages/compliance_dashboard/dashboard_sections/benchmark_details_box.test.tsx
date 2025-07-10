/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../../../test/test_provider';
import { BenchmarkDetailsBox } from './benchmark_details_box';
import { getBenchmarkMockData } from '../mock';

const mockNavToFindings = jest.fn();
jest.mock('@kbn/cloud-security-posture/src/hooks/use_navigate_findings', () => ({
  useNavigateFindings: () => mockNavToFindings,
}));

describe('BenchmarkDetailsBox', () => {
  const renderBenchmarkDetails = () =>
    render(
      <TestProvider>
        <BenchmarkDetailsBox benchmark={getBenchmarkMockData()} activeNamespace="test-namespace" />
      </TestProvider>
    );

  it('renders the component correctly', () => {
    const { getByTestId } = renderBenchmarkDetails();
    expect(getByTestId('benchmark-asset-type')).toBeInTheDocument();
  });

  it('calls the navigate function with correct parameters when a benchmark is clicked', () => {
    const { getByTestId } = renderBenchmarkDetails();
    const benchmarkLink = getByTestId('benchmark-asset-type');
    benchmarkLink.click();

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        'data_stream.namespace': 'test-namespace',
        'rule.benchmark.id': 'cis_aws',
        'rule.benchmark.version': '1.2.3',
      },
      ['cloud.account.id']
    );
  });
});
