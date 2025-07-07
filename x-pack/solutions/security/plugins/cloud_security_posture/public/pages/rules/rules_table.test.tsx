/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProvider } from '../../test/test_provider';
import { RulesTable } from './rules_table';
import * as TEST_SUBJECTS from './test_subjects';
import { selectRulesMock } from './__mocks__/rules_table_headers.mock';
import { CspBenchmarkRulesWithStates } from './rules_container';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  CHANGE_RULE_STATE,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useChangeCspRuleState } from './use_change_csp_rule_state';
import userEvent from '@testing-library/user-event';
import { RULES_TABLE } from './test_subjects';
import { SECURITY_FEATURE_ID } from '../../test/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getWrapper =
  (
    { canUpdate = true }: { canUpdate: boolean } = { canUpdate: true }
  ): FC<PropsWithChildren<unknown>> =>
  ({ children }) => {
    const coreStart = coreMock.createStart();
    const core = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          [SECURITY_FEATURE_ID]: { crud: canUpdate },
        },
      },
    };
    return (
      <QueryClientProvider client={queryClient}>
        <TestProvider core={core}>{children}</TestProvider>
      </QueryClientProvider>
    );
  };

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: {
    trackUiMetric: jest.fn(),
  },
  CHANGE_RULE_STATE: 'cloud_security_posture.rule.change_state',
}));

jest.mock('./use_change_csp_rule_state');

describe('RulesTable', () => {
  const Wrapper = getWrapper();
  const mockProps = {
    setPagination: jest.fn(),
    perPage: 25,
    rules_page: selectRulesMock as CspBenchmarkRulesWithStates[],
    page: 0,
    total: selectRulesMock.length,
    loading: false,
    error: undefined,
    selectedRuleId: undefined,
    selectedRules: [],
    setSelectedRules: jest.fn(),
    onRuleClick: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    (useChangeCspRuleState as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  it('renders table with correct test id', () => {
    render(
      <Wrapper>
        <RulesTable {...mockProps} />
      </Wrapper>
    );

    expect(screen.getByTestId(TEST_SUBJECTS.CSP_RULES_TABLE)).toBeInTheDocument();
  });

  it('tracks metric when toggling rule state', async () => {
    render(
      <Wrapper>
        <RulesTable {...mockProps} />
      </Wrapper>
    );

    const switchButtons = screen.getAllByTestId(RULES_TABLE.RULES_ROWS_ENABLE_SWITCH_BUTTON);
    await userEvent.click(switchButtons[0]);

    expect(uiMetricService.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.COUNT,
      CHANGE_RULE_STATE
    );
  });

  it('calls mutateRulesStates with correct params when toggling rule state', async () => {
    const mutateMock = jest.fn();
    (useChangeCspRuleState as jest.Mock).mockReturnValue({
      mutate: mutateMock,
      isLoading: false,
    });

    render(
      <Wrapper>
        <RulesTable {...mockProps} />
      </Wrapper>
    );

    const switchButtons = screen.getAllByTestId(RULES_TABLE.RULES_ROWS_ENABLE_SWITCH_BUTTON);
    await userEvent.click(switchButtons[0]);

    expect(mutateMock).toHaveBeenCalledWith({
      newState: 'mute',
      ruleIds: [
        {
          benchmark_id: selectRulesMock[0].metadata.benchmark.id,
          benchmark_version: selectRulesMock[0].metadata.benchmark.version,
          rule_number: selectRulesMock[0].metadata.benchmark.rule_number,
          rule_id: selectRulesMock[0].metadata.id,
        },
      ],
    });
  });
});
