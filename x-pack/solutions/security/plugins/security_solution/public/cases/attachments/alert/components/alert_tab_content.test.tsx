/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CaseUI } from '@kbn/cases-plugin/common';
import type { BulkActionsConfig, TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { AlertTabContent, REMOVE_ALERTS_FROM_CASE_TEST_ID } from './alert_tab_content';

interface MockAlertsTableProps {
  additionalBulkActionItems?: BulkActionsConfig[];
  onRemoveFromCase?: (alertId: string) => void;
}

const mockAlertsTable = jest.fn((_props: MockAlertsTableProps) => (
  <div data-test-subj="alerts-table" />
));

jest.mock('@kbn/cases-plugin/common', () => ({
  ...jest.requireActual('@kbn/cases-plugin/common'),
  getManualAlertIds: () => ['alert-1', 'alert-2'],
}));
jest.mock('../../../../detections/components/alerts_table', () => ({
  AlertsTable: (props: MockAlertsTableProps) => mockAlertsTable(props),
}));
const mockEaseAlertsTable = jest.fn((_props: MockAlertsTableProps) => (
  <div data-test-subj="ease-alerts-table" />
));
let mockIsEase = false;

jest.mock('../../../components/ease/wrapper', () => ({
  EaseAlertsTable: (props: MockAlertsTableProps) => mockEaseAlertsTable(props),
}));
jest.mock('../../../../notes/hooks/use_fetch_notes', () => ({
  useFetchNotes: () => ({ onLoad: jest.fn() }),
}));
jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({ useAlertsPrivileges: () => ({ hasAlertsRead: true }) })
);
jest.mock('../../../../common/lib/kibana', () => {
  const { SECURITY_FEATURE_ID } = jest.requireActual('../../../../../common/constants');
  return {
    useKibana: () => ({
      services: {
        application: { capabilities: { [SECURITY_FEATURE_ID]: { configurations: mockIsEase } } },
      },
    }),
  };
});

const caseData = { id: 'case-1', owner: 'securitySolution', comments: [] } as unknown as CaseUI;

const getTableProps = (): MockAlertsTableProps | undefined =>
  mockAlertsTable.mock.calls.at(-1)?.[0];

const getBulkActionItems = (): BulkActionsConfig[] | undefined =>
  getTableProps()?.additionalBulkActionItems;

const toAlerts = (ids: string[]): TimelineItem[] =>
  ids.map((_id) => ({ _id, data: [], ecs: { _id } }));

describe('AlertTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEase = false;
  });

  it('passes the remove actions to the EASE alerts table', () => {
    mockIsEase = true;
    const onRemove = jest.fn();
    render(<AlertTabContent caseData={caseData} onRemove={onRemove} />);

    const easeProps = mockEaseAlertsTable.mock.calls.at(-1)?.[0];
    expect(easeProps?.additionalBulkActionItems).toEqual([
      expect.objectContaining({ key: REMOVE_ALERTS_FROM_CASE_TEST_ID }),
    ]);

    easeProps?.onRemoveFromCase?.('alert-1');

    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['alert-1'] });
  });

  it('adds no bulk action without onRemove', () => {
    render(<AlertTabContent caseData={caseData} />);

    expect(getBulkActionItems()).toBeUndefined();
  });

  it('removes the selected alerts by their ids and clears the selection on success', () => {
    const onRemove = jest.fn();
    const clearSelection = jest.fn();
    render(<AlertTabContent caseData={caseData} onRemove={onRemove} />);

    const [removeAction] = getBulkActionItems() ?? [];
    expect(removeAction).toEqual(
      expect.objectContaining({ key: REMOVE_ALERTS_FROM_CASE_TEST_ID, disableOnQuery: true })
    );

    removeAction.onClick?.(toAlerts(['alert-2']), false, jest.fn(), clearSelection, jest.fn());

    expect(onRemove).toHaveBeenCalledWith(
      { attachmentIds: ['alert-2'] },
      { onSuccess: clearSelection }
    );
  });

  it('adds no row action without onRemove', () => {
    render(<AlertTabContent caseData={caseData} />);

    expect(getTableProps()?.onRemoveFromCase).toBeUndefined();
  });

  it('removes a single alert from the row actions', () => {
    const onRemove = jest.fn();
    render(<AlertTabContent caseData={caseData} onRemove={onRemove} />);

    getTableProps()?.onRemoveFromCase?.('alert-1');

    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['alert-1'] });
  });
});
