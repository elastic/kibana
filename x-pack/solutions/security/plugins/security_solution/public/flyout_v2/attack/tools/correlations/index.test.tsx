/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { CorrelationsDetails } from '.';
import { usePaginatedAlerts } from '../../../document/tools/correlations/hooks/use_paginated_alerts';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { ATTACK_CORRELATIONS_TABLE_TEST_ID, ATTACK_CORRELATIONS_TOOL_TEST_ID } from './test_ids';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../document/tools/correlations/hooks/use_paginated_alerts');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../common/hooks/is_in_security_app');
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn().mockReturnValue({
    openPreviewPanel: jest.fn(),
    closeFlyout: jest.fn(),
    openFlyout: jest.fn(),
    openLeftPanel: jest.fn(),
    openRightPanel: jest.fn(),
    closeLeftPanel: jest.fn(),
    closeRightPanel: jest.fn(),
    closePreviewPanel: jest.fn(),
    previousPreviewPanel: jest.fn(),
    state: undefined,
  }),
}));
jest.mock('../../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => ({
    timelinePrivileges: { read: true },
    rulesPrivileges: { rules: { read: true } },
  }),
}));
jest.mock('../../../shared/components/document_tools_flyout_header', () => ({
  DocumentToolsFlyoutHeader: () => <div data-test-subj="mock-document-tools-flyout-header" />,
}));

const mockUsePaginatedAlerts = usePaginatedAlerts as jest.Mock;
const mockUseAlertsPrivileges = useAlertsPrivileges as jest.Mock;
const mockUseIsInSecurityApp = useIsInSecurityApp as jest.Mock;

const mockHit: DataTableRecord = {
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts-security.attack-discovery.alerts-default' },
  flattened: {
    _id: 'attack-1',
    '@timestamp': '2024-01-01T00:00:00.000Z',
    'kibana.alert.attack_discovery.title': 'Test attack',
  },
  isAnchor: false,
} as DataTableRecord;

const defaultPaginatedAlertsResult = {
  setPagination: jest.fn(),
  setSorting: jest.fn(),
  data: [],
  loading: false,
  paginationConfig: {
    pageIndex: 0,
    pageSize: 5,
    totalItemCount: 0,
    pageSizeOptions: [5, 10, 20],
  },
  sorting: { sort: { field: '@timestamp', direction: 'asc' as const }, enableAllColumns: true },
  error: false,
};

const renderTool = ({
  alertIds = ['alert-id-1', 'alert-id-2'],
  onShowAlert,
}: {
  alertIds?: string[];
  onShowAlert?: (id: string, indexName: string) => void;
} = {}) =>
  render(
    <TestProviders>
      <CorrelationsDetails hit={mockHit} alertIds={alertIds} onShowAlert={onShowAlert} />
    </TestProviders>
  );

describe('CorrelationsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlertsPrivileges.mockReturnValue({ hasAlertsRead: true });
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUsePaginatedAlerts.mockReturnValue(defaultPaginatedAlertsResult);
  });

  it('renders the header and body', () => {
    const { getByTestId } = renderTool();

    expect(getByTestId('mock-document-tools-flyout-header')).toBeInTheDocument();
    expect(getByTestId(ATTACK_CORRELATIONS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('renders the correlated-alerts table panel', () => {
    const { getByTestId } = renderTool();

    // ExpandablePanel renders the toggle icon with the test ID prefix
    expect(getByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}ToggleIcon`)).toBeInTheDocument();
  });

  describe('populated state', () => {
    it('shows alert rows when alertIds are provided and data is loaded', () => {
      mockUsePaginatedAlerts.mockReturnValue({
        ...defaultPaginatedAlertsResult,
        data: [
          {
            _id: 'alert-id-1',
            _index: '.alerts-test',
            fields: {
              '@timestamp': ['2024-01-01T00:00:00.000Z'],
              'kibana.alert.rule.name': ['Test Rule'],
              'kibana.alert.reason': ['Test reason'],
              'kibana.alert.severity': ['medium'],
              'kibana.alert.rule.uuid': ['rule-uuid-1'],
            },
          },
        ],
        paginationConfig: {
          pageIndex: 0,
          pageSize: 5,
          totalItemCount: 1,
          pageSizeOptions: [5, 10, 20],
        },
      });

      const { getAllByRole } = renderTool({ alertIds: ['alert-id-1'] });

      // 1 header row + 1 data row
      expect(getAllByRole('row').length).toBeGreaterThanOrEqual(2);
    });

    it('calls onShowAlert when the alert preview button is clicked', () => {
      mockUsePaginatedAlerts.mockReturnValue({
        ...defaultPaginatedAlertsResult,
        data: [
          {
            _id: 'alert-id-1',
            _index: '.alerts-test',
            fields: {
              '@timestamp': ['2024-01-01T00:00:00.000Z'],
              'kibana.alert.rule.name': ['Test Rule'],
              'kibana.alert.reason': ['Test reason'],
              'kibana.alert.severity': ['medium'],
              'kibana.alert.rule.uuid': ['rule-uuid-1'],
            },
          },
        ],
        paginationConfig: {
          pageIndex: 0,
          pageSize: 5,
          totalItemCount: 1,
          pageSizeOptions: [5, 10, 20],
        },
      });

      const onShowAlert = jest.fn();
      const { getByTestId } = renderTool({ alertIds: ['alert-id-1'], onShowAlert });

      fireEvent.click(getByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}AlertPreviewButton`));

      expect(onShowAlert).toHaveBeenCalledWith('alert-id-1', '.alerts-test');
    });
  });

  describe('empty state', () => {
    it('shows the no-related-alerts message when alertIds is empty', () => {
      const { getByText } = renderTool({ alertIds: [] });

      expect(getByText('No related alerts.')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders without errors when the paginated query is loading', () => {
      mockUsePaginatedAlerts.mockReturnValue({
        ...defaultPaginatedAlertsResult,
        loading: true,
        data: [],
      });

      const { getByTestId } = renderTool();

      expect(getByTestId(ATTACK_CORRELATIONS_TOOL_TEST_ID)).toBeInTheDocument();
      // ExpandablePanel toggle icon is rendered; content panel shows loading skeleton
      expect(getByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}ToggleIcon`)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('hides the table content when the paginated query returns an error', () => {
      mockUsePaginatedAlerts.mockReturnValue({
        ...defaultPaginatedAlertsResult,
        error: true,
        data: [],
      });

      const { getByTestId, queryByTestId } = renderTool();

      // ExpandablePanel still renders its toggle icon
      expect(getByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}ToggleIcon`)).toBeInTheDocument();
      // When error=true, ExpandablePanel hides the table from the content section
      expect(queryByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}Table`)).not.toBeInTheDocument();
    });
  });
});
