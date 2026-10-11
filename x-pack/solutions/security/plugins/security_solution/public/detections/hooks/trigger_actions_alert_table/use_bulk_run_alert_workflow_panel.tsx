/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertsTableProps,
  BulkActionsConfig,
  ContentPanelConfig,
  RenderContentPanelProps,
  TimelineItem,
} from '@kbn/response-ops-alerts-table/types';
import type { TableId } from '@kbn/securitysolution-data-table';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import { useCaseAttachmentWorkflowRouting } from '@kbn/cases-plugin/public';
import React, { useCallback, useMemo } from 'react';
import * as i18n from '../../components/alerts_table/translations';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import {
  RUN_WORKFLOWS_PANEL_WIDTH,
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import type {
  RunWorkflowSelectionScope,
  SelectionIdSearchHandler,
} from '../../components/alerts_table/timeline_actions/use_run_workflow_selection';
import {
  RunWorkflowSelectionStatus,
  toHitSelections,
  useResolvedRunWorkflowSelection,
  useRunWorkflowSelectionSearch,
} from '../../components/alerts_table/timeline_actions/use_run_workflow_selection';
import type { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useSignalIndexName } from '../../../data_view_manager/hooks/use_signal_index_name';

/** Distinct from the table's own id so this search does not disturb the table's query state. */
const RUN_WORKFLOW_SELECTION_QUERY_ID = 'bulk-run-workflow-selection';

interface BulkAlertWorkflowsPanelProps {
  alertItems: TimelineItem[];
  /**
   * True when the user chose "select all N alerts". The table only ever hands over the loaded
   * page, so the full selection has to be fetched before the run payload can be built.
   */
  isAllSelected: boolean;
  searchAlertIds: SelectionIdSearchHandler;
  onClose: () => void;
}

const BulkAlertWorkflowsPanel = ({
  alertItems,
  isAllSelected,
  searchAlertIds,
  onClose,
}: BulkAlertWorkflowsPanelProps) => {
  const pageSelections = useMemo(() => toHitSelections(alertItems), [alertItems]);
  const selection = useResolvedRunWorkflowSelection({
    isAllSelected,
    pageSelections,
    searchSelectionIds: searchAlertIds,
  });

  return (
    <RunWorkflowSelectionStatus selection={selection}>
      {selection.status === 'ready' && (
        <AlertWorkflowsPanel alertIds={selection.selections} onClose={onClose} />
      )}
    </RunWorkflowSelectionStatus>
  );
};

export interface UseBulkRunAlertWorkflowPanelProps {
  /**
   * The query the alerts table runs, including its time range and filters, or the query a host
   * such as a case supplies instead. A "select all" resolves with exactly this query, so it
   * matches the alerts the table counted.
   */
  tableQuery: AlertsTableProps['query'];
  scopeId: PageScope;
  tableId: TableId;
}

export interface UseBulkRunAlertWorkflowPanelResult {
  runWorkflowItems: BulkActionsConfig[];
  runWorkflowPanels: ContentPanelConfig[];
}

export const BULK_RUN_ALERT_WORKFLOW_ACTION_ID = 'bulk-run-alert-workflow';

export const useBulkRunAlertWorkflowPanel = ({
  tableQuery,
  scopeId,
  tableId,
}: UseBulkRunAlertWorkflowPanelProps): UseBulkRunAlertWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite } = useAlertsPrivileges();
  // Inside a case, only offer the action when the run can be recorded on the case.
  const caseRouting = useCaseAttachmentWorkflowRouting();
  const canRunWorkflow = useMemo(
    () => hasIndexWrite && workflowUIEnabled && canExecuteWorkflow && caseRouting !== 'unavailable',
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow, caseRouting]
  );

  const { dataView } = useDataView(scopeId);
  // The page's data view also covers raw event indices, which the alerts table never shows. Search
  // the alerts index alone so a "select all" cannot pick up events the table did not count.
  const signalIndexName = useSignalIndexName();
  const alertIndexNames = useMemo(
    () => (signalIndexName ? [signalIndexName] : []),
    [signalIndexName]
  );
  const runtimeMappings = useMemo(
    () => dataView.getRuntimeMappings() as RunTimeMappings,
    [dataView]
  );
  const dataViewId = useMemo(() => dataView.id ?? '', [dataView.id]);

  // The table query already carries the time range, so the search adds none of its own.
  const filterQuery = useMemo(() => JSON.stringify(tableQuery), [tableQuery]);

  const selectionScope: RunWorkflowSelectionScope = useMemo(
    () => ({
      dataViewId,
      indexNames: alertIndexNames,
      filterQuery,
      runtimeMappings,
      queryId: `${tableId}-${RUN_WORKFLOW_SELECTION_QUERY_ID}`,
    }),
    [dataViewId, alertIndexNames, filterQuery, runtimeMappings, tableId]
  );

  const searchAlertIds = useRunWorkflowSelectionSearch(selectionScope);

  const renderContent = useCallback(
    (props: RenderContentPanelProps) => (
      <BulkAlertWorkflowsPanel
        alertItems={props.alertItems}
        isAllSelected={props.isAllSelected ?? false}
        searchAlertIds={searchAlertIds}
        onClose={props.closePopoverMenu}
      />
    ),
    [searchAlertIds]
  );

  const runWorkflowItems = useMemo<BulkActionsConfig[]>(
    () =>
      canRunWorkflow
        ? [
            {
              key: BULK_RUN_ALERT_WORKFLOW_ACTION_ID,
              'data-test-subj': 'bulk-run-alert-workflow-action',
              label: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              disableOnQuery: false,
              icon: 'workflow' as const,
              groupId: 'workflow' as const,
            },
          ]
        : [],
    [canRunWorkflow]
  );

  const runWorkflowPanels = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: i18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'bulk-alert-workflow-context-menu-panel',
              width: RUN_WORKFLOWS_PANEL_WIDTH,
              renderContent,
            },
          ]
        : [],
    [canRunWorkflow, renderContent]
  );

  return useMemo(
    () => ({
      runWorkflowItems,
      runWorkflowPanels,
    }),
    [runWorkflowItems, runWorkflowPanels]
  );
};
