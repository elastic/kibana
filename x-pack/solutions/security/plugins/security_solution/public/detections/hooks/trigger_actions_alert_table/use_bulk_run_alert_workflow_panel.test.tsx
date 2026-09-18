/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { RenderContentPanelProps, TimelineItem } from '@kbn/response-ops-alerts-table/types';
import type { TableId } from '@kbn/securitysolution-data-table';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import type { UseBulkRunAlertWorkflowPanelProps } from './use_bulk_run_alert_workflow_panel';
import { useBulkRunAlertWorkflowPanel } from './use_bulk_run_alert_workflow_panel';
import { RUN_WORKFLOW_BULK_PANEL_ID } from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { TestProviders } from '../../../common/mock';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import * as i18n from '../../components/alerts_table/translations';
import { PageScope } from '../../../data_view_manager/constants';
import { useTimelineEventsHandler } from '../../../timelines/containers';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsCapabilities: jest.fn(),
  useWorkflowsUIEnabledSetting: jest.fn(),
}));
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../timelines/containers');
jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: { id: 'data-view-id', getRuntimeMappings: () => ({}) } }),
}));
jest.mock('../../../data_view_manager/hooks/use_selected_patterns', () => ({
  useSelectedPatterns: () => ['.alerts-security.alerts-default'],
}));
jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));
jest.mock('../../../common/lib/kuery', () => ({
  combineQueries: () => ({ filterQuery: '{"bool":{}}' }),
}));

const useTimelineEventsHandlerMock = useTimelineEventsHandler as jest.MockedFunction<
  typeof useTimelineEventsHandler
>;

const defaultProps: UseBulkRunAlertWorkflowPanelProps = {
  localFilters: [],
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  scopeId: PageScope.alerts,
  tableId: 'alerts-page' as TableId,
};

const alertItem = (id: string, index?: string): TimelineItem => ({
  _id: id,
  ...(index !== undefined ? { _index: index } : {}),
  data: [],
  ecs: { _id: id, ...(index !== undefined ? { _index: index } : {}) },
});

/**
 * Stubs the id-resolving search so `isAllSelected` runs resolve to `events` out of `totalCount`
 * total matches. `totalCount` above `events.length` is what signals a trimmed selection.
 */
const mockAlertIdSearch = ({
  events,
  totalCount,
}: {
  events: TimelineItem[];
  totalCount: number;
}) => {
  const searchHandler = jest.fn((onResponse) => {
    onResponse?.({ events, totalCount } as never);
  });
  useTimelineEventsHandlerMock.mockReturnValue([
    undefined as never,
    undefined as never,
    searchHandler as never,
  ]);
  return searchHandler;
};

const useWorkflowsCapabilitiesMock = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;
const useWorkflowsUIEnabledSettingMock = useWorkflowsUIEnabledSetting as jest.MockedFunction<
  typeof useWorkflowsUIEnabledSetting
>;

const createCapabilities = (
  overrides: {
    canExecuteWorkflow?: boolean;
  } = {}
) => {
  const { canExecuteWorkflow = true } = overrides;

  return {
    ...createMockWorkflowsCapabilities(),
    canExecuteWorkflow,
  };
};

jest.mock('../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel', () => {
  const actual = jest.requireActual(
    '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel'
  );
  const MockAlertWorkflowsPanel = ({
    alertIds,
  }: {
    alertIds: Array<{ _id: string; _index: string }>;
  }) => (
    <div data-test-subj="bulk-alert-workflows-panel">
      {alertIds.map((a) => (
        <span key={a._id} data-test-subj={`alert-id-${a._id}`}>
          {`${a._id}:${a._index}`}
        </span>
      ))}
    </div>
  );
  return {
    ...actual,
    AlertWorkflowsPanel: MockAlertWorkflowsPanel,
  };
});

describe('useBulkRunAlertWorkflowPanel', () => {
  beforeEach(() => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: true });
    useWorkflowsCapabilitiesMock.mockReturnValue(createCapabilities());
    useWorkflowsUIEnabledSettingMock.mockReturnValue(true);
    mockAlertIdSearch({ events: [], totalCount: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hook return values', () => {
    it('returns run workflow items and panels when user has write, workflow UI enabled, and execute capability', () => {
      const { result } = renderHook(() => useBulkRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowItems).toHaveLength(1);
      expect(result.current.runWorkflowItems[0].key).toBe('bulk-run-alert-workflow');
      expect(result.current.runWorkflowItems[0]['data-test-subj']).toBe(
        'bulk-run-alert-workflow-action'
      );
      expect(result.current.runWorkflowItems[0].label).toBe(i18n.CONTEXT_MENU_RUN_WORKFLOW);
      expect(result.current.runWorkflowItems[0].panel).toBe(RUN_WORKFLOW_BULK_PANEL_ID);
      expect(result.current.runWorkflowItems[0].disableOnQuery).toBe(false);

      expect(result.current.runWorkflowPanels).toHaveLength(1);
      expect(result.current.runWorkflowPanels[0].id).toBe(RUN_WORKFLOW_BULK_PANEL_ID);
      expect(result.current.runWorkflowPanels[0].title).toBe(i18n.SELECT_WORKFLOW_PANEL_TITLE);
      expect(result.current.runWorkflowPanels[0]['data-test-subj']).toBe(
        'bulk-alert-workflow-context-menu-panel'
      );
      expect(result.current.runWorkflowPanels[0].renderContent).toBeDefined();
    });

    it('returns empty arrays when workflow UI is disabled', () => {
      useWorkflowsUIEnabledSettingMock.mockReturnValue(false);

      const { result } = renderHook(() => useBulkRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowItems).toEqual([]);
      expect(result.current.runWorkflowPanels).toEqual([]);
    });

    it('returns empty arrays when user does not have executeWorkflow capability', () => {
      useWorkflowsCapabilitiesMock.mockReturnValue(
        createCapabilities({ canExecuteWorkflow: false })
      );

      const { result } = renderHook(() => useBulkRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowItems).toEqual([]);
      expect(result.current.runWorkflowPanels).toEqual([]);
    });

    it('returns empty arrays when user does not have index write', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: false });

      const { result } = renderHook(() => useBulkRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowItems).toEqual([]);
      expect(result.current.runWorkflowPanels).toEqual([]);
    });
  });

  describe('panel renderContent', () => {
    const renderPanel = (
      props: Partial<RenderContentPanelProps> & { alertItems: TimelineItem[] }
    ) => {
      const { result } = renderHook(() => useBulkRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });
      const renderContent = result.current.runWorkflowPanels[0].renderContent;
      const closePopoverMenu = props.closePopoverMenu ?? jest.fn();

      render(
        <TestProviders>
          {renderContent({
            setIsBulkActionsLoading: jest.fn(),
            ...props,
            closePopoverMenu,
          })}
        </TestProviders>
      );

      return { closePopoverMenu };
    };

    it('renders AlertWorkflowsPanel with alertIds derived from alertItems', () => {
      renderPanel({
        alertItems: [alertItem('alert-1', 'index-1'), alertItem('alert-2', 'index-2')],
      });

      expect(screen.getByTestId('bulk-alert-workflows-panel')).toBeInTheDocument();
      expect(screen.getByTestId('alert-id-alert-1')).toHaveTextContent('alert-1:index-1');
      expect(screen.getByTestId('alert-id-alert-2')).toHaveTextContent('alert-2:index-2');
    });

    it('uses empty string for _index when alertItem._index is undefined', () => {
      renderPanel({ alertItems: [alertItem('no-index')] });

      expect(screen.getByTestId('alert-id-no-index')).toHaveTextContent('no-index:');
    });

    it('does not resolve the full selection when only the page is selected', () => {
      const searchHandler = mockAlertIdSearch({ events: [], totalCount: 0 });

      renderPanel({ alertItems: [alertItem('alert-1', 'index-1')], isAllSelected: false });

      expect(searchHandler).not.toHaveBeenCalled();
      expect(screen.getByTestId('alert-id-alert-1')).toBeInTheDocument();
    });

    it('runs on every matching alert, not just the loaded page, when all are selected', async () => {
      // The table only ever hands over the loaded page, so `alert-2` can only come from the search.
      mockAlertIdSearch({
        events: [alertItem('alert-1', 'index-1'), alertItem('alert-2', 'index-2')],
        totalCount: 2,
      });

      renderPanel({ alertItems: [alertItem('alert-1', 'index-1')], isAllSelected: true });

      await waitFor(() => {
        expect(screen.getByTestId('alert-id-alert-2')).toHaveTextContent('alert-2:index-2');
      });
      expect(screen.getByTestId('alert-id-alert-1')).toHaveTextContent('alert-1:index-1');
      expect(screen.queryByTestId('bulk-run-workflow-selection-trimmed')).not.toBeInTheDocument();
    });

    it('requests at most the supported maximum when resolving the selection', () => {
      renderPanel({ alertItems: [alertItem('alert-1', 'index-1')], isAllSelected: true });

      expect(useTimelineEventsHandlerMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: MAX_RUN_WORKFLOW_DOCS, fields: ['_id'] })
      );
    });

    it('warns that the selection was trimmed when more alerts match than the maximum', async () => {
      mockAlertIdSearch({
        events: [alertItem('alert-1', 'index-1')],
        totalCount: MAX_RUN_WORKFLOW_DOCS + 1,
      });

      renderPanel({ alertItems: [alertItem('alert-1', 'index-1')], isAllSelected: true });

      await waitFor(() => {
        expect(screen.getByTestId('bulk-run-workflow-selection-trimmed')).toBeInTheDocument();
      });
      // The run still proceeds — on the alerts that were resolved.
      expect(screen.getByTestId('alert-id-alert-1')).toBeInTheDocument();
    });

    it('surfaces an error instead of a partial run when resolving the selection fails', () => {
      useTimelineEventsHandlerMock.mockReturnValue([
        undefined as never,
        undefined as never,
        (() => {
          throw new Error('search failed');
        }) as never,
      ]);

      renderPanel({ alertItems: [alertItem('alert-1', 'index-1')], isAllSelected: true });

      expect(screen.getByTestId('bulk-run-workflow-selection-error')).toBeInTheDocument();
      expect(screen.queryByTestId('bulk-alert-workflows-panel')).not.toBeInTheDocument();
    });
  });
});
