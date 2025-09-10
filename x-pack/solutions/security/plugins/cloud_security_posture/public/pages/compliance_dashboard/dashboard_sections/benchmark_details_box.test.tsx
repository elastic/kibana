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
import { FINDINGS_FILTER_OPTIONS } from '../../../common/constants';

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
        [FINDINGS_FILTER_OPTIONS.NAMESPACE]: 'test-namespace',
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_ID]: 'cis_aws',
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_VERSION]: '1.2.3',
      },
      ['cloud.account.id']
    );
  });
});
