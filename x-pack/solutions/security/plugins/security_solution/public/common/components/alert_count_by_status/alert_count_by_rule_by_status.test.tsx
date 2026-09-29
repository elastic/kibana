/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';

import { render } from '@testing-library/react';

import { TestProviders } from '../../mock';
import { AlertCountByRuleByStatus } from './alert_count_by_rule_by_status';
import { COLUMN_HEADER_COUNT, COLUMN_HEADER_RULE_NAME } from './translations';
import type {
  UseAlertCountByRuleByStatus,
  UseAlertCountByRuleByStatusProps,
} from './use_alert_count_by_rule_by_status';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';

type UseAlertCountByRuleByStatusReturn = ReturnType<UseAlertCountByRuleByStatus>;
const defaultUseAlertCountByRuleByStatusReturn: UseAlertCountByRuleByStatusReturn = {
  items: [],
  isLoading: false,
  updatedAt: Date.now(),
};

const mockUseAlertCountByRuleByStatus = vi.fn(
  (_props: UseAlertCountByRuleByStatusProps) => defaultUseAlertCountByRuleByStatusReturn
);
const mockUseAlertCountByRuleByStatusReturn = (
  overrides: Partial<UseAlertCountByRuleByStatusReturn>
) => {
  mockUseAlertCountByRuleByStatus.mockReturnValue({
    ...defaultUseAlertCountByRuleByStatusReturn,
    ...overrides,
  });
};

vi.mock('./use_alert_count_by_rule_by_status', () => {
  const mocked = {
    useAlertCountByRuleByStatus: (props: UseAlertCountByRuleByStatusProps) =>
      mockUseAlertCountByRuleByStatus(props),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/entity-store/public', () => {
  const mocked = {
    FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:entityStoreEnableV2',
    useEntityStoreEuidApi: vi.fn(() => undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../lib/kibana/kibana_react', async () => {
  const actual = await vi.importActual('../../lib/kibana/kibana_react');
  return { ...actual, useUiSetting: vi.fn(() => false) };
});

vi.mock('../../hooks/timeline/use_investigate_in_timeline', () => {
  const mocked = {
    useInvestigateInTimeline: vi.fn(() => ({ investigateInTimeline: vi.fn() })),
  };
  return { ...mocked, default: mocked };
});

const entityFilter = { field: 'host.hostname', value: 'some_host_name' };

const renderComponent = (
  overrides: Partial<React.ComponentProps<typeof AlertCountByRuleByStatus>> = {}
) =>
  render(
    <TestProviders>
      <AlertCountByRuleByStatus entityFilter={entityFilter} signalIndexName={''} {...overrides} />
    </TestProviders>
  );

describe('AlertCountByRuleByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const { getAllByTestId } = renderComponent();
    const columnHeaders = getAllByTestId(/tableHeaderCell/);

    expect(columnHeaders.at(0)).toHaveTextContent(COLUMN_HEADER_RULE_NAME);
    expect(columnHeaders.at(1)).toHaveTextContent(COLUMN_HEADER_COUNT);
  });

  it('should render the table items', () => {
    mockUseAlertCountByRuleByStatusReturn({ items: mockItem });
    const { queryByTestId } = renderComponent();

    expect(queryByTestId(COLUMN_HEADER_RULE_NAME)).toHaveTextContent('Test Name');
    expect(queryByTestId(COLUMN_HEADER_COUNT)).toHaveTextContent('100');
  });

  it('should pass resolved identityFields from entityFilter to the hook', () => {
    renderComponent();

    expect(mockUseAlertCountByRuleByStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        identityFields: { 'host.hostname': 'some_host_name' },
      })
    );
  });

  it('should prefer identityFields prop over entityFilter when both are provided', () => {
    const identityFields = { 'host.id': 'host-uuid-123', 'entity.id': 'entity-abc' };
    renderComponent({ identityFields });

    expect(mockUseAlertCountByRuleByStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        identityFields,
      })
    );
  });

  it('should pass entityRecord and entityType to the hook if defined', () => {
    const entityRecord = { 'host.name': ['some_host_name'] } as unknown as EntityStoreRecord;
    renderComponent({ entityRecord, entityType: 'host' });

    expect(mockUseAlertCountByRuleByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ entityRecord, entityType: 'host' })
    );
  });
});

const mockItem = [
  {
    count: 100,
    ruleName: 'Test Name',
    uuid: 'uuid',
  },
];
