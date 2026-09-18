/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
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
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import * as i18n from '../../components/alerts_table/translations';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import {
  RUN_WORKFLOWS_PANEL_WIDTH,
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import type { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import { combineQueries } from '../../../common/lib/kuery';
import { useKibana } from '../../../common/lib/kibana';
import { globalFiltersQuerySelector } from '../../../common/store/inputs/selectors';
import type { TimelineArgs } from '../../../timelines/containers';
import { useTimelineEventsHandler } from '../../../timelines/containers';

interface AlertSelection {
  _id: string;
  _index: string;
}

/**
 * Only `_id` is requested: the run payload carries `(id, index)` pairs and the server fetches
 * each source, so pulling fields here would be wasted bandwidth.
 */
const ID_ONLY_FIELDS = ['_id'];

/** Distinct from the table's own id so this search does not disturb the table's query state. */
const RUN_WORKFLOW_SELECTION_QUERY_ID = 'bulk-run-workflow-selection';

type AlertIdSearchHandler = (onResponse: (response: TimelineArgs) => void) => void;

const toAlertSelections = (items: TimelineItem[]): AlertSelection[] =>
  items.map(({ _id, _index }) => ({ _id, _index: _index ?? '' }));

interface BulkAlertWorkflowsPanelProps {
  alertItems: TimelineItem[];
  /**
   * True when the user chose "select all N alerts". The table only ever hands over the loaded
   * page, so the full selection has to be fetched before the run payload can be built.
   */
  isAllSelected: boolean;
  searchAlertIds: AlertIdSearchHandler;
  onClose: () => void;
}

const BulkAlertWorkflowsPanel = ({
  alertItems,
  isAllSelected,
  searchAlertIds,
  onClose,
}: BulkAlertWorkflowsPanelProps) => {
  const pageAlertIds = useMemo(() => toAlertSelections(alertItems), [alertItems]);
  const [selection, setSelection] = useState<{
    alertIds: AlertSelection[];
    wasTrimmed: boolean;
  } | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!isAllSelected) {
      return;
    }
    let isStale = false;
    try {
      searchAlertIds((response) => {
        if (isStale) {
          return;
        }
        setSelection({
          alertIds: toAlertSelections(response.events),
          wasTrimmed: response.totalCount > response.events.length,
        });
      });
    } catch {
      setHasFailed(true);
    }
    return () => {
      isStale = true;
    };
  }, [isAllSelected, searchAlertIds]);

  if (hasFailed) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        size="s"
        title={i18n.RUN_WORKFLOW_SELECTION_FAILED}
        data-test-subj="bulk-run-workflow-selection-error"
      />
    );
  }

  if (isAllSelected && selection === null) {
    return <EuiLoadingSpinner size="m" data-test-subj="bulk-run-workflow-selection-loading" />;
  }

  const alertIds = isAllSelected && selection !== null ? selection.alertIds : pageAlertIds;

  return (
    <>
      {selection?.wasTrimmed === true && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            size="s"
            title={i18n.RUN_WORKFLOW_SELECTION_TRIMMED(MAX_RUN_WORKFLOW_DOCS)}
            data-test-subj="bulk-run-workflow-selection-trimmed"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <AlertWorkflowsPanel alertIds={alertIds} onClose={onClose} />
    </>
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

  // Resolves the ids of every alert matching the table's query, newest first, so "select all"
  // runs on the whole selection instead of the loaded page. Capped rather than paged: the run
  // payload carries the ids, so the cap is what keeps the request within the payload limit.
  const [, , searchAlertIds] = useTimelineEventsHandler({
    dataViewId,
    endDate: to,
    startDate: from,
    id: `${tableId}-${RUN_WORKFLOW_SELECTION_QUERY_ID}`,
    fields: ID_ONLY_FIELDS,
    indexNames: selectedPatterns,
    filterQuery,
    runtimeMappings,
    limit: MAX_RUN_WORKFLOW_DOCS,
    timerangeKind: 'absolute',
  });

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

  const runWorkflowItems = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              key: 'bulk-run-alert-workflow',
              'data-test-subj': 'bulk-run-alert-workflow-action',
              label: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              disableOnQuery: false,
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
