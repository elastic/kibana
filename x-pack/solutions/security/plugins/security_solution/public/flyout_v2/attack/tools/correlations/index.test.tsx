/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { CorrelationsDetails } from '.';
import { usePaginatedAlerts } from '../../../document/tools/correlations/hooks/use_paginated_alerts';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { ATTACK_CORRELATIONS_TABLE_TEST_ID, ATTACK_CORRELATIONS_TOOL_TEST_ID } from './test_ids';

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return { ...actual, useLocation: vi.fn().mockReturnValue({ pathname: '' }) };
});

vi.mock('../../../document/tools/correlations/hooks/use_paginated_alerts');
vi.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
vi.mock('../../../../common/hooks/is_in_security_app');
vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: vi.fn().mockReturnValue({
        openPreviewPanel: vi.fn(),
        closeFlyout: vi.fn(),
        openFlyout: vi.fn(),
        openLeftPanel: vi.fn(),
        openRightPanel: vi.fn(),
        closeLeftPanel: vi.fn(),
        closeRightPanel: vi.fn(),
        closePreviewPanel: vi.fn(),
        previousPreviewPanel: vi.fn(),
        state: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/components/user_privileges', () => {
      const mocked = {
      useUserPrivileges: () => ({
        timelinePrivileges: { read: true },
        rulesPrivileges: { rules: { read: true } },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../shared/components/document_tools_flyout_header', () => {
      const mocked = {
      DocumentToolsFlyoutHeader: () => <div data-test-subj="mock-document-tools-flyout-header" />,
    };
      return { ...mocked, default: mocked };
    });

const mockUsePaginatedAlerts = usePaginatedAlerts as Mock;
const mockUseAlertsPrivileges = useAlertsPrivileges as Mock;
const mockUseIsInSecurityApp = useIsInSecurityApp as Mock;

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
  setPagination: vi.fn(),
  setSorting: vi.fn(),
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
    vi.clearAllMocks();
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

      const onShowAlert = vi.fn();
      const { getByTestId } = renderTool({ alertIds: ['alert-id-1'], onShowAlert });

      fireEvent.click(getByTestId(`${ATTACK_CORRELATIONS_TABLE_TEST_ID}AlertPreviewButton`));

      expect(onShowAlert).toHaveBeenCalledWith('alert-id-1', '.alerts-test', 'Alert: Test Rule');
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
