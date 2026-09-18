/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { TestProviders } from '../../../mock';
import type { StatefulAlertBulkActionsProps } from './alert_bulk_actions';
import { AlertBulkActionsComponent } from './alert_bulk_actions';
import { TableId } from '@kbn/securitysolution-data-table';
import { clearSelected } from '@kbn/securitysolution-data-table/store/data_table/actions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

// Spied rather than stubbed so the menu-item assertions keep exercising the real hook.
jest.mock('./use_bulk_action_items', () => {
  const actual = jest.requireActual('./use_bulk_action_items');
  return {
    ...actual,
    useBulkActionItems: jest.fn((args) => actual.useBulkActionItems(args)),
  };
});

const useBulkActionItemsMock = jest.requireMock('./use_bulk_action_items')
  .useBulkActionItems as jest.Mock;

const mockSelectedEventIds: Record<string, TimelineNonEcsData[]> = {
  nvowrrn: [{ field: 'nvowrrn' }],
};

function renderAlertBulkActions(props?: Partial<StatefulAlertBulkActionsProps>) {
  return render(
    <TestProviders>
      <AlertBulkActionsComponent
        isSelectAllChecked={false}
        id={TableId.alertsOnAlertsPage}
        selectedEventIds={mockSelectedEventIds}
        totalItems={10}
        data={[]}
        clearSelected={clearSelected}
        {...props}
      />
    </TestProviders>
  );
}

describe('AlertBulkActionsComponent', () => {
  beforeEach(() => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsUpdate: true });
  });

  it('it renders', async () => {
    const { getByTestId } = renderAlertBulkActions();
    expect(getByTestId('bulk-actions-button-container')).toBeInTheDocument();
  });

  describe('after clicking the bulk actions button', () => {
    beforeEach(async () => {
      const { container } = renderAlertBulkActions();
      const bulkActionsButton = container.querySelector(
        'button[data-test-subj="selectedShowBulkActionsButton"]'
      )!;

      await userEvent.click(bulkActionsButton);
    });

    it('"Mark as open" should be visible', () => {
      expect(screen.getByTestId('open-alert-status')).toBeInTheDocument();
    });
    it('"Mark as acknowledged" should be visible', () => {
      expect(screen.getByTestId('acknowledged-alert-status')).toBeInTheDocument();
    });
    it('"Mark as closed" should be visible', () => {
      expect(screen.getByTestId('alert-close-context-menu-item')).toBeInTheDocument();
    });
  });

  // The store only ever holds the loaded rows, so bulk actions that act on the whole selection
  // need to know when the user asked for all of them.
  it('reports a "select all" to the bulk actions so they are not capped to the loaded rows', async () => {
    renderAlertBulkActions();
    expect(useBulkActionItemsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isAllSelected: false })
    );

    await userEvent.click(screen.getByTestId('selectAllAlertsButton'));

    expect(useBulkActionItemsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isAllSelected: true })
    );
  });

  it('passes the caller selection scope through to the bulk actions', () => {
    const selectionScope = {
      dataViewId: 'security-solution-default',
      indexNames: ['logs-*'],
      filterQuery: '{"bool":{}}',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      runtimeMappings: {},
      queryId: 'test-table-run-workflow-selection',
    };

    renderAlertBulkActions({ selectionScope });

    expect(useBulkActionItemsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectionScope })
    );
  });
});
