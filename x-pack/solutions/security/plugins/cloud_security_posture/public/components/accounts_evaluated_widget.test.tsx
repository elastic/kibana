/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AccountsEvaluatedWidget } from './accounts_evaluated_widget';
import { BenchmarkData } from '../../common/types_old';
import { TestProvider } from '../test/test_provider';
import { FINDINGS_FILTER_OPTIONS, FINDINGS_GROUPING_OPTIONS } from '../common/constants';

const mockNavToFindings = jest.fn();
jest.mock('@kbn/cloud-security-posture/src/hooks/use_navigate_findings', () => ({
  useNavigateFindings: () => mockNavToFindings,
}));

describe('AccountsEvaluatedWidget', () => {
  const benchmarkAssets = [
    { meta: { benchmarkId: 'cis_aws', assetCount: 10 } },
    { meta: { benchmarkId: 'cis_k8s', assetCount: 20 } },
  ] as BenchmarkData[];

  it('renders the component with benchmark data correctly', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    expect(getByText('10')).toBeInTheDocument();
    expect(getByText('20')).toBeInTheDocument();
  });

  it('calls navToFindingsByCloudProvider when a benchmark with provider is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    fireEvent.click(getByText('10'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        [FINDINGS_FILTER_OPTIONS.CLOUD_PROVIDER]: 'aws',
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_POSTURE_TYPE]: 'cspm',
      },
      ['cloud.account.id']
    );
  });

  it('calls navToFindingsByCloudProvider when a benchmark with provider and namespace is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget
          activeNamespace="test-namespace"
          benchmarkAssets={benchmarkAssets}
          benchmarkAbbreviateAbove={999}
        />
      </TestProvider>
    );

    fireEvent.click(getByText('10'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        [FINDINGS_FILTER_OPTIONS.NAMESPACE]: 'test-namespace',
        [FINDINGS_FILTER_OPTIONS.CLOUD_PROVIDER]: 'aws',
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_POSTURE_TYPE]: 'cspm',
      },
      [FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID]
    );
  });

  it('calls navToFindingsByCisBenchmark when a benchmark with benchmarkId is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget benchmarkAssets={benchmarkAssets} benchmarkAbbreviateAbove={999} />
      </TestProvider>
    );

    fireEvent.click(getByText('20'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_ID]: 'cis_k8s',
      },
      [FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_ID]
    );
  });

  it('calls navToFindingsByCisBenchmark when a benchmark with benchmarkId and namespace is clicked', () => {
    const { getByText } = render(
      <TestProvider>
        <AccountsEvaluatedWidget
          benchmarkAssets={benchmarkAssets}
          benchmarkAbbreviateAbove={999}
          activeNamespace="test-namespace"
        />
      </TestProvider>
    );

    fireEvent.click(getByText('20'));

    expect(mockNavToFindings).toHaveBeenCalledWith(
      {
        [FINDINGS_FILTER_OPTIONS.RULE_BENCHMARK_ID]: 'cis_k8s',
        [FINDINGS_FILTER_OPTIONS.NAMESPACE]: 'test-namespace',
      },
      [FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_ID]
    );
  });
});
