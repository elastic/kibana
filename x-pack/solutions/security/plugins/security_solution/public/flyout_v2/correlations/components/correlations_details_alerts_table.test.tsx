/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  type CorrelationsCustomTableColumn,
  CorrelationsDetailsAlertsTable,
} from './correlations_details_alerts_table';
import { getColumns } from '../utils/get_columns';
import { usePaginatedAlerts } from '../hooks/use_paginated_alerts';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { mockFlyoutApi } from '../../../flyout/document_details/shared/mocks/mock_flyout_context';
import { mockContextValue } from '../../../flyout/document_details/shared/mocks/mock_context';
import { RULE_PREVIEW_BANNER, RulePreviewPanelKey } from '../../../flyout/rule_details/right';
import { TableId } from '@kbn/securitysolution-data-table';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../hooks/use_paginated_alerts');
jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('@kbn/expandable-flyout');
jest.mock('../../../common/hooks/is_in_security_app');
jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => ({
    timelinePrivileges: {
      read: true,
    },
    rulesPrivileges: {
      rules: {
        read: true,
      },
    },
  }),
}));

const useAlertsPrivilegesMock = useAlertsPrivileges as jest.Mock;

const TEST_ID = 'TEST';
const alertIds = ['id1', 'id2', 'id3'];
const mockOnShowAlert = jest.fn();

const renderCorrelationsTable = ({
  scopeId = mockContextValue.scopeId,
  columns,
  hidePreviewLink = true,
}: {
  scopeId?: string;
  columns?: Array<CorrelationsCustomTableColumn>;
  hidePreviewLink?: boolean;
} = {}) =>
  render(
    <TestProviders>
      <CorrelationsDetailsAlertsTable
        title={<p>{'title'}</p>}
        loading={false}
        alertIds={alertIds}
        scopeId={scopeId}
        eventId={mockContextValue.eventId}
        data-test-subj={TEST_ID}
        columns={
          columns ??
          getColumns({
            scopeId,
            dataTestSubj: TEST_ID,
            onShowAlert: mockOnShowAlert,
            hidePreviewLink,
          })
        }
      />
    </TestProviders>
  );

describe('CorrelationsDetailsAlertsTable', () => {
  beforeEach(() => {
    useAlertsPrivilegesMock.mockReturnValue({
      hasAlertsRead: true,
    });
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    jest.mocked(useIsInSecurityApp).mockReturnValue(true);
    jest.mocked(usePaginatedAlerts).mockReturnValue({
      setPagination: jest.fn(),
      setSorting: jest.fn(),
      data: [
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-01'],
            'kibana.alert.rule.name': ['Rule1'],
            'kibana.alert.reason': ['Reason1'],
            'kibana.alert.severity': ['Severity1'],
            'kibana.alert.rule.uuid': ['uuid1'],
          },
        },
        {
          _id: '1',
          _index: 'index',
          fields: {
            '@timestamp': ['2022-01-02'],
            'kibana.alert.rule.name': ['Rule2'],
            'kibana.alert.reason': ['Reason2'],
            'kibana.alert.severity': ['Severity2'],
            'kibana.alert.rule.uuid': ['uuid2'],
          },
        },
      ],
      loading: false,
      paginationConfig: {
        pageIndex: 0,
        pageSize: 5,
        totalItemCount: 10,
        pageSizeOptions: [5, 10, 20],
      },
      sorting: { sort: { field: '@timestamp', direction: 'asc' }, enableAllColumns: true },
      error: false,
    });
  });

  it('renders EuiBasicTable with correct props', () => {
    const { getByTestId, getAllByTestId, queryAllByRole } = renderCorrelationsTable();

    expect(getByTestId(`${TEST_ID}InvestigateInTimeline`)).toBeInTheDocument();
    expect(getByTestId(`${TEST_ID}Table`)).toBeInTheDocument();
    expect(getAllByTestId(`${TEST_ID}AlertPreviewButton`)).toHaveLength(2);

    expect(jest.mocked(usePaginatedAlerts)).toHaveBeenCalled();

    expect(queryAllByRole('columnheader').length).toBe(5);
    expect(queryAllByRole('row').length).toBe(3); // 1 header row and 2 data rows
    expect(queryAllByRole('row')[1].textContent).toContain('Jan 1, 2022 @ 00:00:00.000');
    expect(queryAllByRole('row')[1].textContent).toContain('Reason1');
    expect(queryAllByRole('row')[1].textContent).toContain('Rule1');
    expect(queryAllByRole('row')[1].textContent).toContain('Severity1');
  });

  it('renders open preview button and calls onAlertPreview when clicked', () => {
    const { getByTestId, getAllByTestId } = renderCorrelationsTable({
      scopeId: TableId.rulePreview,
    });

    expect(getByTestId(`${TEST_ID}InvestigateInTimeline`)).toBeInTheDocument();
    expect(getAllByTestId(`${TEST_ID}AlertPreviewButton`).length).toBe(2);

    getAllByTestId(`${TEST_ID}AlertPreviewButton`)[0].click();
    expect(mockOnShowAlert).toHaveBeenCalledWith('1', 'index');
  });

  it('opens rule preview when isRulePreview is false', () => {
    const { getAllByTestId } = renderCorrelationsTable({ hidePreviewLink: false });

    expect(getAllByTestId(`${TEST_ID}RulePreview`).length).toBe(2);

    getAllByTestId(`${TEST_ID}RulePreview`)[0].click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: RulePreviewPanelKey,
      params: {
        ruleId: 'uuid1',
        banner: RULE_PREVIEW_BANNER,
        isPreviewMode: true,
      },
    });
  });

  it('does not render InvestigateInTimeline button when not in Security Solution', () => {
    jest.mocked(useIsInSecurityApp).mockReturnValue(false);
    const { queryByTestId } = renderCorrelationsTable();
    expect(queryByTestId(`${TEST_ID}InvestigateInTimeline`)).not.toBeInTheDocument();
  });

  it('does not render preview link when isRulePreview is true', () => {
    const { queryByTestId } = renderCorrelationsTable({ scopeId: TableId.rulePreview });
    expect(queryByTestId(`${TEST_ID}RulePreview`)).not.toBeInTheDocument();
  });

  it('renders custom columns when columns prop is provided', () => {
    const columns: Array<CorrelationsCustomTableColumn> = [
      {
        field: 'kibana.alert.attack_discovery.title',
        name: 'Title',
      },
      {
        field: 'kibana.alert.workflow_status',
        name: 'Status',
      },
      {
        field: 'kibana.alert.attack_discovery.alert_ids',
        name: 'Alert count',
        preserveArray: true,
        render: (value: unknown) => (Array.isArray(value) ? value.length : ''),
      },
    ];

    jest.mocked(usePaginatedAlerts).mockReturnValue({
      setPagination: jest.fn(),
      setSorting: jest.fn(),
      data: [
        {
          _id: '1',
          _index: 'index',
          fields: {
            'kibana.alert.attack_discovery.title': ['Attack 1'],
            'kibana.alert.workflow_status': ['open'],
            'kibana.alert.attack_discovery.alert_ids': ['a-1', 'a-2'],
          },
        },
      ],
      loading: false,
      paginationConfig: {
        pageIndex: 0,
        pageSize: 5,
        totalItemCount: 1,
        pageSizeOptions: [5, 10, 20],
      },
      sorting: { sort: { field: '@timestamp', direction: 'asc' }, enableAllColumns: true },
      error: false,
    });

    const { queryAllByRole, getByText } = renderCorrelationsTable({ columns });
    expect(queryAllByRole('columnheader').length).toBe(3);
    expect(getByText('Attack 1')).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();
    expect(getByText('2')).toBeInTheDocument();
  });
});
