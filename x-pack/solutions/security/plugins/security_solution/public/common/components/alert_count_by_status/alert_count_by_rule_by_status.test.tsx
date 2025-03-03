/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';

import { TestProviders } from '../../mock';
import { AlertCountByRuleByStatus } from './alert_count_by_rule_by_status';
import { COLUMN_HEADER_COUNT, COLUMN_HEADER_RULE_NAME } from './translations';
import type { UseAlertCountByRuleByStatus } from './use_alert_count_by_rule_by_status';

type UseAlertCountByRuleByStatusReturn = ReturnType<UseAlertCountByRuleByStatus>;
const defaultUseAlertCountByRuleByStatusReturn: UseAlertCountByRuleByStatusReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
};

const mockUseAlertCountByRuleByStatus = jest.fn(() => defaultUseAlertCountByRuleByStatusReturn);
const mockUseAlertCountByRuleByStatusReturn = (
  overrides: Partial<UseAlertCountByRuleByStatusReturn>
) => {
  mockUseAlertCountByRuleByStatus.mockReturnValue({
    ...defaultUseAlertCountByRuleByStatusReturn,
    ...overrides,
  });
};

jest.mock('./use_alert_count_by_rule_by_status', () => ({
  useAlertCountByRuleByStatus: () => mockUseAlertCountByRuleByStatus(),
}));

const renderComponent = () =>
  render(
    <TestProviders>
      <AlertCountByRuleByStatus
        entityFilter={{
          field: 'host.hostname',
          value: 'some_host_name',
        }}
        signalIndexName={''}
      />
    </TestProviders>
  );

describe('AlertCountByRuleByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty table', () => {
    const { getByText, queryByTestId } = renderComponent();

    expect(queryByTestId('alertCountByRulePanel')).toBeInTheDocument();
    expect(getByText('No alerts to display')).toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseAlertCountByRuleByStatusReturn({ isLoading: true });
    const { getByText, queryByTestId } = renderComponent();

    expect(getByText('Updating...')).toBeInTheDocument();
    expect(queryByTestId('alertCountByRuleTable')).toHaveClass('euiBasicTable-loading');
  });

  it('should render the table columns', () => {
    const { getAllByRole } = renderComponent();
    const columnHeaders = getAllByRole('columnheader');

    expect(columnHeaders.at(0)).toHaveTextContent(COLUMN_HEADER_RULE_NAME);
    expect(columnHeaders.at(1)).toHaveTextContent(COLUMN_HEADER_COUNT);
  });

  it('should render the table items', () => {
    mockUseAlertCountByRuleByStatusReturn({ items: mockItem });
    const { queryByTestId } = renderComponent();

    expect(queryByTestId(COLUMN_HEADER_RULE_NAME)).toHaveTextContent('Test Name');
    expect(queryByTestId(COLUMN_HEADER_COUNT)).toHaveTextContent('100');
  });
});

const mockItem = [
  {
    count: 100,
    ruleName: 'Test Name',
    uuid: 'uuid',
  },
];
