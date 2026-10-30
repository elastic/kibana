/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProvider } from '../../test/test_provider';
import { RulesTable } from './rules_table';
import * as TEST_SUBJECTS from './test_subjects';
import { selectRulesMock } from './__mocks__/rules_table_headers.mock';
import type { CspBenchmarkRulesWithStates } from './rules_container';
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

  it('renders checkboxes with proper aria-labels for accessibility', () => {
    render(
      <Wrapper>
        <RulesTable {...mockProps} />
      </Wrapper>
    );

    // The table provides the "select all" checkbox
    expect(screen.getAllByTestId('checkboxSelectAll')).toHaveLength(1);

    // Individual rule checkboxes are named after their rule
    const mockRuleName = selectRulesMock[0].metadata.name;
    expect(
      screen.getByRole('checkbox', { name: `Select rule: ${mockRuleName}` })
    ).toBeInTheDocument();
  });

  describe('row selection', () => {
    const [firstRule, secondRule] = selectRulesMock as CspBenchmarkRulesWithStates[];
    // a rule that is selected but is not part of the rules shown in the current page
    const ruleOnAnotherPage = {
      ...firstRule,
      metadata: { ...firstRule.metadata, id: 'rule-on-another-page', name: 'Rule on another page' },
    } as CspBenchmarkRulesWithStates;

    const originalInnerWidth = window.innerWidth;
    const setViewportWidth = (width: number) => {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));
    };

    afterEach(() => {
      setViewportWidth(originalInnerWidth);
    });

    it('selects a rule and keeps the rules selected on other pages', async () => {
      const setSelectedRules = jest.fn();
      render(
        <Wrapper>
          <RulesTable
            {...mockProps}
            selectedRules={[ruleOnAnotherPage]}
            setSelectedRules={setSelectedRules}
          />
        </Wrapper>
      );

      await userEvent.click(
        screen.getByRole('checkbox', { name: `Select rule: ${firstRule.metadata.name}` })
      );

      expect(setSelectedRules).toHaveBeenCalledWith([ruleOnAnotherPage, firstRule]);
    });

    it('deselects a rule and keeps the rules selected on other pages', async () => {
      const setSelectedRules = jest.fn();
      render(
        <Wrapper>
          <RulesTable
            {...mockProps}
            selectedRules={[ruleOnAnotherPage, firstRule]}
            setSelectedRules={setSelectedRules}
          />
        </Wrapper>
      );

      const checkbox = screen.getByRole('checkbox', {
        name: `Select rule: ${firstRule.metadata.name}`,
      });
      expect(checkbox).toBeChecked();

      await userEvent.click(checkbox);

      expect(setSelectedRules).toHaveBeenCalledWith([ruleOnAnotherPage]);
    });

    it('"select all" selects every rule of the current page and keeps the other pages', async () => {
      const setSelectedRules = jest.fn();
      render(
        <Wrapper>
          <RulesTable
            {...mockProps}
            selectedRules={[ruleOnAnotherPage]}
            setSelectedRules={setSelectedRules}
          />
        </Wrapper>
      );

      await userEvent.click(screen.getByTestId('checkboxSelectAll'));

      expect(setSelectedRules).toHaveBeenCalledWith([ruleOnAnotherPage, firstRule, secondRule]);
    });

    it('"select all" deselects only the rules of the current page', async () => {
      const setSelectedRules = jest.fn();
      render(
        <Wrapper>
          <RulesTable
            {...mockProps}
            selectedRules={[ruleOnAnotherPage, firstRule, secondRule]}
            setSelectedRules={setSelectedRules}
          />
        </Wrapper>
      );

      const selectAll = screen.getByTestId('checkboxSelectAll');
      expect(selectAll).toBeChecked();

      await userEvent.click(selectAll);

      expect(setSelectedRules).toHaveBeenCalledWith([ruleOnAnotherPage]);
    });

    it('does not alter a selection that spans multiple pages when it renders', () => {
      const setSelectedRules = jest.fn();
      render(
        <Wrapper>
          <RulesTable
            {...mockProps}
            selectedRules={[ruleOnAnotherPage, firstRule, secondRule]}
            setSelectedRules={setSelectedRules}
          />
        </Wrapper>
      );

      expect(setSelectedRules).not.toHaveBeenCalled();
    });

    it('shows the "select all" checkbox as indeterminate when only some rules are selected', () => {
      render(
        <Wrapper>
          <RulesTable {...mockProps} selectedRules={[firstRule]} />
        </Wrapper>
      );

      expect((screen.getByTestId('checkboxSelectAll') as HTMLInputElement).indeterminate).toBe(
        true
      );
    });

    // WCAG 2.2 SC 1.4.10 Reflow: at 400% zoom the table is rendered in its stacked (mobile) layout
    it('renders a single "select all" checkbox and a single checkbox per rule at 400% zoom', () => {
      setViewportWidth(320);
      render(
        <Wrapper>
          <RulesTable {...mockProps} />
        </Wrapper>
      );

      // 1 "select all" + 1 per rule; `getAllByRole` ignores the table's hidden header copy
      expect(screen.getAllByRole('checkbox')).toHaveLength(1 + selectRulesMock.length);
      expect(screen.getAllByRole('checkbox', { name: /select all rows/i })).toHaveLength(1);
    });
  });
});
