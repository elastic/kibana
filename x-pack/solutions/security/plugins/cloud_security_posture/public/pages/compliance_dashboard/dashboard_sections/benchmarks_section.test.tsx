/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BenchmarksSection } from './benchmarks_section';
import { getMockDashboardData, getBenchmarkMockData } from '../mock';
import { TestProvider } from '../../../test/test_provider';
import {
  DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID,
  DASHBOARD_TABLE_HEADER_SCORE_TEST_ID,
} from '../test_subjects';

describe('<BenchmarksSection />', () => {
  const renderBenchmarks = (alterMockData = {}) =>
    render(
      <TestProvider>
        <BenchmarksSection
          complianceData={{ ...getMockDashboardData(), ...alterMockData }}
          dashboardType={KSPM_POLICY_TEMPLATE}
        />
      </TestProvider>
    );

  describe('Sorting', () => {
    const mockDashboardDataCopy = getMockDashboardData();
    const benchmarkMockDataCopy = getBenchmarkMockData();
    benchmarkMockDataCopy.stats.postureScore = 50;
    benchmarkMockDataCopy.meta.benchmarkId = 'cis_aws';

    const benchmarkMockDataCopy1 = getBenchmarkMockData();
    benchmarkMockDataCopy1.stats.postureScore = 95;
    benchmarkMockDataCopy1.meta.benchmarkId = 'cis_azure';

    const benchmarkMockDataCopy2 = getBenchmarkMockData();
    benchmarkMockDataCopy2.stats.postureScore = 45;
    benchmarkMockDataCopy2.meta.benchmarkId = 'cis_gcp';

    mockDashboardDataCopy.benchmarks = [
      benchmarkMockDataCopy,
      benchmarkMockDataCopy1,
      benchmarkMockDataCopy2,
    ];

    it('sorts by ascending order of compliance scores', () => {
      const { getAllByTestId } = renderBenchmarks(mockDashboardDataCopy);
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('45');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('95');
    });

    it('toggles sort order when clicking Posture Score', async () => {
      const { getAllByTestId, getByTestId } = renderBenchmarks(mockDashboardDataCopy);

      await userEvent.click(getByTestId(DASHBOARD_TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('95');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('45');

      await userEvent.click(getByTestId(DASHBOARD_TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('45');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('95');
    });
  });
});
