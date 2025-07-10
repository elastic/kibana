/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RulesCounters } from './rules_counters';
import { useBenchmarkDynamicValues } from '../../common/hooks/use_benchmark_dynamic_values';
import { useParams } from 'react-router-dom';
import { RULE_COUNTERS_TEST_SUBJ } from './test_subjects';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import { useCspBenchmarkIntegrationsV2 } from '../benchmarks/use_csp_benchmark_integrations';
import { useKibana } from '../../common/hooks/use_kibana';
import { within } from '@testing-library/dom';
import { cloudPosturePages } from '../../common/navigation/constants';
import { RULE_FAILED } from '../../../common/constants';
import userEvent from '@testing-library/user-event';
import { benchmarkValuesMock, itemsDataMock, paramsMock } from './__mocks__';

jest.mock('../../common/hooks/use_benchmark_dynamic_values');
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
}));
jest.mock('@kbn/cloud-security-posture/src/hooks/use_navigate_findings');
jest.mock('../benchmarks/use_csp_benchmark_integrations');
jest.mock('../../common/hooks/use_kibana');

describe('RulesCounters', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          basePath: {
            basePath: '/kbn',
            serverBasePath: '/kbn',
            assetsHrefBase: '/kbn/XXXXXXXXXXXX',
            prepend: (path: string) => path,
          },
        },
        charts: {
          theme: {
            useChartsBaseTheme: () => ({}),
          },
        },
      },
    });

    (useCspBenchmarkIntegrationsV2 as jest.Mock).mockReturnValue({
      status: 'success',
      data: {
        items: itemsDataMock,
      },
    });

    (useBenchmarkDynamicValues as jest.Mock).mockReturnValue({
      getBenchmarkDynamicValues: () => benchmarkValuesMock,
    });

    (useParams as jest.Mock).mockReturnValue(paramsMock);

    (useNavigateFindings as jest.Mock).mockReturnValue(mockNavigate); // Store the mock function
  });

  it('should not show empty state and show correct posture score', () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);

    expect(
      screen.queryByTestId(RULE_COUNTERS_TEST_SUBJ.RULE_COUNTERS_EMPTY_STATE)
    ).not.toBeInTheDocument();
    const postureScoreContainer = screen.getByTestId(RULE_COUNTERS_TEST_SUBJ.POSTURE_SCORE_COUNTER);

    expect(within(postureScoreContainer).getByText('76%')).toBeInTheDocument();
  });

  it('have correct href on posture score button', () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);

    const postureScoreButton = screen.getByTestId(RULE_COUNTERS_TEST_SUBJ.POSTURE_SCORE_BUTTON);
    expect(postureScoreButton).toHaveAttribute(
      'href',
      expect.stringContaining(`/app/security${cloudPosturePages.dashboard.path}`)
    );
  });

  it('shows integrations count when there are findings', () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);
    screen.debug();
    const integrationsCounter = screen.getByTestId(
      RULE_COUNTERS_TEST_SUBJ.INTEGRATIONS_EVALUATED_COUNTER
    );
    expect(within(integrationsCounter).getByText('1')).toBeInTheDocument();
  });

  it('have correct href on integrations counter button', () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);

    const postureScoreButton = screen.getByTestId(
      RULE_COUNTERS_TEST_SUBJ.INTEGRATIONS_EVALUATED_BUTTON
    );
    expect(postureScoreButton).toHaveAttribute(
      'href',
      expect.stringContaining(benchmarkValuesMock.integrationLink)
    );
  });

  it('shows the failed findings counter when there are findings', () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);
    const failedFindingsCounter = screen.getByTestId(
      RULE_COUNTERS_TEST_SUBJ.FAILED_FINDINGS_COUNTER
    );
    expect(within(failedFindingsCounter).getByText('20')).toBeInTheDocument();
  });

  it('call useNavigateFindings with correct params when clicking on failed findings button', async () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);

    const failedFindingsButton = screen.getByTestId(RULE_COUNTERS_TEST_SUBJ.FAILED_FINDINGS_BUTTON);
    await userEvent.click(failedFindingsButton);

    expect(mockNavigate).toHaveBeenCalledWith({
      'result.evaluation': RULE_FAILED,
      'rule.benchmark.id': paramsMock.benchmarkId,
      'rule.benchmark.version': `v${paramsMock.benchmarkVersion}`,
    });
  });

  it('shows the disabled rules count', async () => {
    render(<RulesCounters mutedRulesCount={0} setEnabledDisabledItemsFilter={() => {}} />);
    const dislabedRulesCounter = screen.getByTestId(RULE_COUNTERS_TEST_SUBJ.DISABLED_RULES_COUNTER);
    expect(within(dislabedRulesCounter).getByText('0')).toBeInTheDocument();
  });
});
