/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { RulesTableHeader } from './rules_table_header';
import { CspBenchmarkRulesWithStates } from './rules_container';
import { TestProvider } from '../../test/test_provider';
import { coreMock } from '@kbn/core/public/mocks';
import { RULES_TABLE_HEADER_TEST_SUBJ } from './test_subjects';
import userEvent from '@testing-library/user-event';
import { useChangeCspRuleState } from './use_change_csp_rule_state';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { selectRulesMock } from './__mocks__';
import { SECURITY_FEATURE_ID } from '../../test/constants';

jest.mock('./use_change_csp_rule_state');

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

describe('RulesTableHeader', () => {
  const Wrapper = getWrapper();

  const mockProps = {
    search: jest.fn(),
    searchValue: '',
    isSearching: false,
    totalRulesCount: 2,
    pageSize: 25,
    onSectionChange: jest.fn(),
    onRuleNumberChange: jest.fn(),
    sectionSelectOptions: ['Logging', 'Worker Node Configuration Files'],
    ruleNumberSelectOptions: ['2.1.1', '3.1.1'],
    selectedRules: selectRulesMock as CspBenchmarkRulesWithStates[],
    setEnabledDisabledItemsFilter: jest.fn(),
    enabledDisabledItemsFilterState: 'no-filter',
    setSelectAllRules: jest.fn(),
    setSelectedRules: jest.fn(),
  };

  beforeEach(() => {
    (useChangeCspRuleState as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
  });

  it('renders header with correct initial state', () => {
    render(
      <Wrapper>
        <RulesTableHeader {...mockProps} />
      </Wrapper>
    );
    expect(
      screen.getByTestId(RULES_TABLE_HEADER_TEST_SUBJ.RULES_TABLE_HEADER_SEARCH_INPUT)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(RULES_TABLE_HEADER_TEST_SUBJ.RULES_TABLE_HEADER_MULTI_SELECT)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(RULES_TABLE_HEADER_TEST_SUBJ.RULES_TABLE_HEADER_RULE_NUMBER_SELECT)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(RULES_TABLE_HEADER_TEST_SUBJ.RULES_TABLE_HEADER_RULE_SHOWING_LABEL)
    ).toBeInTheDocument();
  });

  it('update multi-select filter when selecting an option', async () => {
    render(
      <Wrapper>
        <RulesTableHeader {...mockProps} />
      </Wrapper>
    );

    const multiSelectFilterId = 'cis-section-multi-select-filter';
    const multiSelectFilter = await screen.findByTestId(
      `options-filter-popover-button-${multiSelectFilterId}`
    );

    await userEvent.click(multiSelectFilter);

    const firstOption = screen.getByText('Logging');
    await userEvent.click(firstOption);
    const updatedMultiSelect = screen.getByTestId(
      RULES_TABLE_HEADER_TEST_SUBJ.RULES_TABLE_HEADER_MULTI_SELECT
    );
    expect(updatedMultiSelect).toHaveTextContent('1');
  });

  it('calls onRuleNumberChange with correct params on rule selection change', async () => {
    render(
      <Wrapper>
        <RulesTableHeader {...mockProps} />
      </Wrapper>
    );

    const multiSelectFilterId = 'rule-number-multi-select-filter';

    const ruleNumberSelectFilter = await screen.findByTestId(
      `options-filter-popover-button-${multiSelectFilterId}`
    );

    await userEvent.click(ruleNumberSelectFilter);

    const firstOption = await screen.findByText('2.1.1');
    await userEvent.click(firstOption);
    expect(mockProps.onRuleNumberChange).toHaveBeenCalledWith(['2.1.1']);
  });

  it('calls setEnabledDisabledItemsFilter with correct params on click', async () => {
    render(
      <Wrapper>
        <RulesTableHeader {...mockProps} />
      </Wrapper>
    );

    const enableFilterButton = await screen.findByTestId(
      RULES_TABLE_HEADER_TEST_SUBJ.RULES_ENABLED_FILTER
    );

    const disableFilterButton = await screen.findByTestId(
      RULES_TABLE_HEADER_TEST_SUBJ.RULES_DISABLED_FILTER
    );

    await userEvent.click(enableFilterButton);

    expect(mockProps.setEnabledDisabledItemsFilter).toHaveBeenCalledWith('enabled');

    await userEvent.click(disableFilterButton);

    expect(mockProps.setEnabledDisabledItemsFilter).toHaveBeenCalledWith('disabled');
  });
});
