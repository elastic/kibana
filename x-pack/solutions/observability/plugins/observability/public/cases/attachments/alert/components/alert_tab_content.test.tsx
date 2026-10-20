/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import type { BulkActionsPanelConfig, TimelineItem } from '@kbn/response-ops-alerts-table/types';
import {
  AlertTabContent,
  REMOVE_OBSERVABILITY_ALERTS_FROM_CASE_TEST_ID,
} from './alert_tab_content';

interface MockAlertsTableProps {
  additionalBulkActions?: BulkActionsPanelConfig[];
  onRemoveFromCase?: (alertId: string) => void;
}

const mockAlertsTable = jest.fn((_props: MockAlertsTableProps) => (
  <div data-test-subj="alerts-table" />
));

jest.mock('@kbn/cases-plugin/common', () => ({
  ...jest.requireActual('@kbn/cases-plugin/common'),
  getManualAlertIds: () => ['alert-1', 'alert-2'],
}));
jest.mock('../../../..', () => ({
  ObservabilityAlertsTable: (props: MockAlertsTableProps) => mockAlertsTable(props),
}));
jest.mock('../../../../utils/kibana_react', () => ({
  useKibana: () => ({ services: {} }),
}));

const caseData = {
  id: 'case-1',
  owner: 'observability',
  comments: [],
} as unknown as CommonAttachmentListViewProps['caseData'];

const getTableProps = (): MockAlertsTableProps | undefined =>
  mockAlertsTable.mock.calls.at(-1)?.[0];

const getBulkActions = (): BulkActionsPanelConfig[] | undefined =>
  getTableProps()?.additionalBulkActions;

const toAlerts = (ids: string[]): TimelineItem[] =>
  ids.map((_id) => ({ _id, data: [], ecs: { _id } }));

describe('AlertTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds no bulk action without onRemove', () => {
    render(<AlertTabContent caseData={caseData} />);

    expect(getBulkActions()).toBeUndefined();
  });

  it('removes the selected alerts by their ids and clears the selection on success', () => {
    const onRemove = jest.fn();
    const clearSelection = jest.fn();
    render(<AlertTabContent caseData={caseData} onRemove={onRemove} />);

    const [removeAction] = getBulkActions()?.[0].items ?? [];
    expect(removeAction).toEqual(
      expect.objectContaining({
        key: REMOVE_OBSERVABILITY_ALERTS_FROM_CASE_TEST_ID,
        disableOnQuery: true,
      })
    );

    removeAction.onClick?.(toAlerts(['alert-2']), false, jest.fn(), clearSelection, jest.fn());

    expect(onRemove).toHaveBeenCalledWith(
      { attachmentIds: ['alert-2'] },
      { onSuccess: clearSelection }
    );
  });

  it('passes a new bulk actions panel on each render', () => {
    const onRemove = jest.fn();
    const { rerender } = render(<AlertTabContent caseData={caseData} onRemove={onRemove} />);
    const [firstPanel] = getBulkActions() ?? [];

    rerender(<AlertTabContent caseData={caseData} onRemove={onRemove} />);

    expect(getBulkActions()?.[0]).not.toBe(firstPanel);
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
