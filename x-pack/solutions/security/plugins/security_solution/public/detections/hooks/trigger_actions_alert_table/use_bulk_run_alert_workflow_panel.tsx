/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type {
  BulkActionsConfig,
  ContentPanelConfig,
  RenderContentPanelProps,
  TimelineItem,
} from '@kbn/response-ops-alerts-table/types';
import type { TableId } from '@kbn/securitysolution-data-table';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
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
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import { combineQueries } from '../../../common/lib/kuery';
import { useKibana } from '../../../common/lib/kibana';
import { globalFiltersQuerySelector } from '../../../common/store/inputs/selectors';

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
  /** Filters derived from the alerts table query, as passed to the other bulk action hooks. */
  localFilters: Filter[];
  from: string;
  to: string;
  scopeId: PageScope;
  tableId: TableId;
}

export interface UseBulkRunAlertWorkflowPanelResult {
  runWorkflowItems: BulkActionsConfig[];
  runWorkflowPanels: ContentPanelConfig[];
}

export const BULK_RUN_ALERT_WORKFLOW_ACTION_ID = 'bulk-run-alert-workflow';

export const useBulkRunAlertWorkflowPanel = ({
  localFilters,
  from,
  to,
  scopeId,
  tableId,
}: UseBulkRunAlertWorkflowPanelProps): UseBulkRunAlertWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite } = useAlertsPrivileges();
  const canRunWorkflow = useMemo(
    () => hasIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const { uiSettings } = useKibana().services;
  const { dataView } = useDataView(scopeId);
  const browserFields = useBrowserFields(dataView);
  const selectedPatterns = useSelectedPatterns(dataView);
  const runtimeMappings = useMemo(
    () => dataView.getRuntimeMappings() as RunTimeMappings,
    [dataView]
  );
  const dataViewId = useMemo(() => dataView.id ?? '', [dataView.id]);

  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const selectGlobalFiltersQuerySelector = useMemo(() => globalFiltersQuerySelector(), []);
  const globalFilters = useSelector(selectGlobalFiltersQuerySelector);
  const combinedFilters = useMemo(
    () => [...localFilters, ...globalFilters],
    [localFilters, globalFilters]
  );

  const filterQuery = useMemo(() => {
    const combinedQuery = combineQueries({
      config: esQueryConfig,
      dataProviders: [],
      dataView,
      filters: combinedFilters,
      kqlQuery: { query: '', language: 'kuery' },
      browserFields,
      kqlMode: 'filter',
    });
    return combinedQuery?.filterQuery ?? '';
  }, [esQueryConfig, dataView, combinedFilters, browserFields]);

  const selectionScope: RunWorkflowSelectionScope = useMemo(
    () => ({
      dataViewId,
      indexNames: selectedPatterns,
      filterQuery,
      from,
      to,
      runtimeMappings,
      queryId: `${tableId}-${RUN_WORKFLOW_SELECTION_QUERY_ID}`,
    }),
    [dataViewId, selectedPatterns, filterQuery, from, to, runtimeMappings, tableId]
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
