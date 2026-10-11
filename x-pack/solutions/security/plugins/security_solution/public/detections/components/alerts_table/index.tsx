/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiDataGridRowHeightsOptions, EuiDataGridStyle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type {
  AlertsTableProps as ResponseOpsAlertsTableProps,
  RenderContext as ResponseOpsRenderContext,
} from '@kbn/response-ops-alerts-table/types';
import { ALERT_BUILDING_BLOCK_TYPE, AlertConsumers } from '@kbn/rule-data-utils';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux-v7';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import type { SetOptional } from 'type-fest';
import { isEmpty, noop } from 'lodash';
import type { Alert } from '@kbn/alerting-types';
import { AlertsTable as ResponseOpsAlertsTable } from '@kbn/response-ops-alerts-table';
import {
  SECURITY_CELL_ACTIONS_CASE_EVENTS,
  SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { documentFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';
import { PaginatedDocumentFlyout } from '../../../flyout_v2/document/pagination/paginated_document_flyout';
import { usePaginatedFlyout } from '../../../flyout_v2/document/pagination/use_paginated_flyout';
import type { ScopedPaginationSlice } from '../../../flyout_v2/document/pagination/types';
import { createCellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import { useAlertsContext } from './alerts_context';
import { useBulkActionsByTableType } from '../../hooks/trigger_actions_alert_table/use_bulk_actions';
import type {
  GetSecurityAlertsTableProp,
  SecurityAlertsTableContext,
  SecurityAlertsTableProps,
} from './types';
import { ActionsCell } from './actions_cell';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useLicense } from '../../../common/hooks/use_license';
import { APP_ID, CASES_FEATURE_ID, VIEW_SELECTION } from '../../../../common/constants';
import { useBulkAddToChatConfig } from '../../../agent_builder/hooks/use_bulk_add_to_chat_config';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { eventsDefaultModel } from '../../../common/components/events_viewer/default_model';
import type { State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { combineQueries } from '../../../common/lib/kuery';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { useKibana, KibanaServices } from '../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { CellValue, getColumns } from '../../configurations/security_solution_detections';
import { buildTimeRangeFilter } from './helpers';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import * as i18n from './translations';
import { eventRenderedViewColumns } from '../../configurations/security_solution_detections/columns';
import { ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE, getAlertsDefaultModel } from './default_config';
import { useFetchNotes } from '../../../notes/hooks/use_fetch_notes';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { useFetchUserProfilesFromAlerts } from '../../configurations/security_solution_detections/fetch_page_context';
import { useCellActionsOptions } from '../../hooks/trigger_actions_alert_table/use_cell_actions';
import { useAlertsTableFieldsBrowserOptions } from '../../hooks/trigger_actions_alert_table/use_trigger_actions_browser_fields_options';
import { AlertTableCellContextProvider } from '../../configurations/security_solution_detections/cell_value_context';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import { DETECTIONS_TABLE_IDS } from '../../constants';

const { updateIsLoading, updateItemsPerPage, updateTotalCount } = dataTableActions;

// we show a maximum of 6 action buttons
// - open flyout
// - investigate in timeline
// - 3-dot menu for more actions
// - add new note
// - session view
// - analyzer graph
const MAX_ACTION_BUTTON_COUNT = 6;
const DEFAULT_DATA_GRID_HEIGHT = 600;

const ALERT_TABLE_CONSUMERS: ResponseOpsAlertsTableProps['consumers'] = [AlertConsumers.SIEM];

// Highlight rows with building block alerts
const shouldHighlightRow = (alert: Alert) => !!alert[ALERT_BUILDING_BLOCK_TYPE];

interface GridContainerProps {
  hideLastPage: boolean;
}

export const FullWidthFlexGroupTable = styled(EuiFlexGroup)`
  overflow: hidden;
  margin: 0;
  display: flex;
`;

const EuiDataGridContainer = styled.div<GridContainerProps>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => {
        return `${hideLastPage ? 'display:none' : ''}`;
      }};
    }
  }

  div .euiDataGridRowCell {
    display: flex;
    align-items: center;
  }

  div .euiDataGridRowCell > [data-focus-lock-disabled] {
    display: flex;
    align-items: center;
    flex-grow: 1;
    width: 100%;
  }

  div .euiDataGridRowCell__content {
    flex-grow: 1;
  }

  div .siemEventsTable__trSupplement--summary {
    display: block;
  }

  width: 100%;
`;

interface AlertTableProps
  extends SetOptional<SecurityAlertsTableProps, 'id' | 'ruleTypeIds' | 'query'> {
  inputFilters?: Filter[];
  tableType?: TableId;
  pageScope?: PageScope;
  isLoading?: boolean;
  onRuleChange?: () => void;
  disableAdditionalToolbarControls?: boolean;
}

const sort: GetSecurityAlertsTableProp<'sort'> = [
  {
    '@timestamp': {
      order: 'desc',
    },
  },
];
const casesConfiguration = {
  featureId: CASES_FEATURE_ID,
  owner: [APP_ID],
};

/** Elasticsearch default `index.max_result_window`. `from + size` cannot exceed it. */
const ES_MAX_RESULT_WINDOW = 10_000;

const getReachableDocumentCount = (total: number, pageSize: number): number => {
  if (total <= 0 || pageSize <= 0) return 0;
  const reachable = Math.floor(ES_MAX_RESULT_WINDOW / pageSize) * pageSize;
  return Math.min(total, reachable);
};
const emptyInputFilters: Filter[] = [];

const AlertsTableComponent: FC<Omit<AlertTableProps, 'services' | 'isMutedAlertsEnabled'>> = ({
  inputFilters = emptyInputFilters,
  tableType = TableId.alertsOnAlertsPage,
  pageScope = PageScope.alerts,
  isLoading,
  onRuleChange,
  disableAdditionalToolbarControls,
  ...tablePropsOverrides
}) => {
  const { id } = tablePropsOverrides;
  const { services: kibanaServices } = useKibana();
  const {
    data,
    http,
    notifications,
    rendering,
    fieldFormats,
    application,
    licensing,
    uiSettings,
    settings,
    cases,
    agentBuilder,
  } = kibanaServices;

  const { from, to, setQuery } = useGlobalTime();

  const dispatch = useDispatch();

  const timelineID = tableType;
  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    onRuleChange,
  });
  const { dataView } = useDataView(pageScope);
  const browserFields = useBrowserFields(dataView);
  const runtimeMappings = useMemo(() => dataView.getRuntimeMappings(), [dataView]);

  const license = useLicense();
  const isEnterprisePlus = license.isEnterprise();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const licenseDefaults = useMemo(() => getAlertsDefaultModel(license), [license]);
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

  const {
    initialized: isDataTableInitialized,
    viewMode: tableView = eventsDefaultModel.viewMode,
    columns,
    totalCount: count,
    itemsPerPage: reduxItemsPerPage = tableDefaults.itemsPerPage,
  } = useSelector((state: State) => getTable(state, tableType) ?? licenseDefaults);

  const timeRangeFilter = useMemo(() => buildTimeRangeFilter(from, to), [from, to]);

  const allFilters = useMemo(() => {
    return [...inputFilters, ...(globalFilters ?? []), ...(timeRangeFilter ?? [])];
  }, [inputFilters, globalFilters, timeRangeFilter]);

  const combinedQuery = useMemo(() => {
    if (browserFields != null) {
      return combineQueries({
        config: getEsQueryConfig(uiSettings),
        dataProviders: [],
        dataView,
        browserFields,
        filters: [...allFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
      });
    }
    return null;
  }, [browserFields, uiSettings, dataView, allFilters, globalQuery]);

  useInvalidFilterQuery({
    id: tableType,
    filterQuery: combinedQuery?.filterQuery,
    kqlError: combinedQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const finalBoolQuery: ResponseOpsAlertsTableProps['query'] = useMemo(() => {
    if (combinedQuery?.kqlError || !combinedQuery?.filterQuery) {
      return { bool: {} };
    }
    return { bool: { filter: JSON.parse(combinedQuery?.filterQuery) } };
  }, [combinedQuery?.filterQuery, combinedQuery?.kqlError]);

  const isEventRenderedView = tableView === VIEW_SELECTION.eventRenderedView;

  const gridStyle = useMemo(
    () =>
      ({
        border: 'none',
        fontSize: 's',
        header: 'underline',
        stripes: isEventRenderedView,
      } as EuiDataGridStyle),
    [isEventRenderedView]
  );

  const rowHeightsOptions: EuiDataGridRowHeightsOptions | undefined = useMemo(() => {
    if (isEventRenderedView) {
      return {
        defaultHeight: 'auto',
      };
    }
    return undefined;
  }, [isEventRenderedView]);

  const alertColumns = useMemo(
    () => (columns?.length ? columns : getColumns(license)),
    [columns, license]
  );

  // Pass undefined (not {}) when browserFields is empty so the shared alerts table can fall back to
  // its own /internal/rac/alerts/browser_fields fetch, recovering the field browser independently.
  // Keep the deliberate {} for event-rendered view where browser fields are intentionally suppressed.
  const finalBrowserFields = useMemo(() => {
    if (isEventRenderedView) {
      return {};
    }
    return isEmpty(browserFields) ? undefined : browserFields;
  }, [isEventRenderedView, browserFields]);

  const finalColumns = useMemo(
    () => (isEventRenderedView ? eventRenderedViewColumns : alertColumns),
    [alertColumns, isEventRenderedView]
  );

  const { onLoad } = useFetchNotes();
  const [tableContext, setTableContext] =
    useState<ResponseOpsRenderContext<SecurityAlertsTableContext>>();

  const { alertsTableRef } = useAlertsContext();

  // Follows the flyout when it steps onto another page. The response-ops table
  // fetches that page itself, so the flyout does not run a second search.
  const [tablePageIndex, setTablePageIndex] = useState(0);

  // `sort` is controlled. Keep the user's choice here so the table query stays
  // in the order they picked.
  const [liftedSort, setLiftedSort] = useState<GetSecurityAlertsTableProp<'sort'>>(
    () => tablePropsOverrides.sort ?? sort
  );

  // The new document details flyout must render alert field cell actions on the details-flyout
  // trigger so the "Toggle column in table" action is available (it is not registered on the
  // default trigger), and forward `alertsTableRef` so that action can target this imperatively
  // controlled table. The alerts table on the Cases page uses the case-events trigger instead.
  const renderFlyoutCellActions = useMemo(
    () =>
      createCellActionRenderer(tableType, {
        triggerId:
          tableType === TableId.alertsOnCasePage
            ? SECURITY_CELL_ACTIONS_CASE_EVENTS
            : SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
        visibleCellActions: 6,
        alertsTableRef,
      }),
    [alertsTableRef, tableType]
  );

  const handleFlyoutAlertUpdated = useCallback(() => {
    alertsTableRef.current?.refresh();
  }, [alertsTableRef]);

  const getDocumentFlyoutBody = useCallback(
    () => (
      <PaginatedDocumentFlyout
        renderCellActions={renderFlyoutCellActions}
        onAlertUpdated={handleFlyoutAlertUpdated}
      />
    ),
    [handleFlyoutAlertUpdated, renderFlyoutCellActions]
  );

  // Resolves the identity of the alert at an absolute index from the page the
  // table is showing. Returns null when that page is not loaded yet; the effect
  // below writes the identity once the table fetch settles. Only `_id` and
  // `_index` are handed over: the flyout fetches the document itself.
  const resolveDocument = useCallback(
    (alertIndex: number) => {
      if (reduxItemsPerPage <= 0 || !tableContext) return null;
      // `tableContext.pageIndex` is what `tableContext.alerts` actually belongs to.
      // `tablePageIndex` can update (via `onPageIndexChange`) a render ahead of
      // `onUpdate` replacing `tableContext`, so resolving against `tablePageIndex`
      // while reading `tableContext.alerts` can pair the new page's offset with
      // the previous page's rows. Gating on `tableContext.pageIndex` instead
      // means we return null (stay loading) until the context actually catches up.
      const targetPageIndex = Math.floor(alertIndex / reduxItemsPerPage);
      const isInPage = targetPageIndex === tableContext.pageIndex;
      const offset = alertIndex - tableContext.pageIndex * reduxItemsPerPage;
      const alert = isInPage ? (tableContext.alerts?.[offset] as Alert | undefined) : undefined;
      if (!alert) return null;
      return getDocumentIdentity(alert);
    },
    [reduxItemsPerPage, tableContext]
  );

  const { openDocumentFlyout, slice, setState } = usePaginatedFlyout({
    resolveDocument,
    renderBody: getDocumentFlyoutBody,
    historyKey: documentFlyoutHistoryKey,
    origin: FLYOUT_ORIGIN.ALERTS_TABLE,
  });

  const { flyoutDocumentIndex, flyoutDocumentId, hasFlyoutQueryError } = slice;

  const onUpdate: GetSecurityAlertsTableProp<'onUpdate'> = useCallback(
    (context) => {
      setTableContext(context);
      dispatch(
        updateIsLoading({
          id: tableType,
          isLoading: context.isLoading ?? true,
        })
      );
      dispatch(
        updateTotalCount({
          id: tableType,
          totalCount: context.alertsCount ?? -1,
        })
      );
      setState({
        totalDocumentCount: getReachableDocumentCount(context.alertsCount ?? 0, reduxItemsPerPage),
      });
      setQuery({
        id: tableType,
        loading: context.isLoading ?? true,
        refetch: context.refresh ?? noop,
        inspect: null,
      });
    },
    [dispatch, reduxItemsPerPage, setQuery, setState, tableType]
  );

  const flyoutPageIndex =
    flyoutDocumentIndex != null && reduxItemsPerPage > 0
      ? Math.floor(flyoutDocumentIndex / reduxItemsPerPage)
      : null;

  const onPageSizeChange = useCallback(
    (newPageSize: number) => {
      dispatch(updateItemsPerPage({ id: tableType, itemsPerPage: newPageSize }));
    },
    [dispatch, tableType]
  );

  // The pager stepped onto a row the table does not have yet: bring the table to that page, then
  // read the identity from it. Only runs while the identity is missing, so a later refetch never
  // repoints a flyout that has already resolved.
  useEffect(() => {
    if (flyoutDocumentIndex == null || flyoutPageIndex == null) return;
    if (flyoutDocumentId != null || hasFlyoutQueryError) return;

    if (tablePageIndex !== flyoutPageIndex) {
      setTablePageIndex(flyoutPageIndex);
      return;
    }
    // `tableContext` is only trustworthy once it describes the page that was asked for.
    if (tableContext?.pageIndex !== flyoutPageIndex || tableContext.isLoadingAlerts) return;

    const alert = tableContext.alerts?.[flyoutDocumentIndex - flyoutPageIndex * reduxItemsPerPage];
    setState(alert ? getDocumentIdentity(alert) : { hasFlyoutQueryError: true });
  }, [
    flyoutDocumentId,
    flyoutDocumentIndex,
    flyoutPageIndex,
    hasFlyoutQueryError,
    reduxItemsPerPage,
    setState,
    tableContext,
    tablePageIndex,
  ]);

  const userProfiles = useFetchUserProfilesFromAlerts({
    alerts: tableContext?.alerts ?? [],
    columns: tableContext?.columns ?? [],
  });

  let ACTION_BUTTON_COUNT = MAX_ACTION_BUTTON_COUNT;

  // hiding the session view icon for users without enterprise plus license
  if (!isEnterprisePlus) {
    ACTION_BUTTON_COUNT--;
  }
  const {
    timelinePrivileges: { read: canReadTimelines },
    notesPrivileges: { read: canReadNotes },
  } = useUserPrivileges();

  // remove space if investigate timeline icon shouldn't be displayed
  if (!canReadTimelines) {
    ACTION_BUTTON_COUNT--;
  }

  if (!canReadNotes) {
    ACTION_BUTTON_COUNT--;
  }

  const leadingControlColumn = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT)[0],
    [ACTION_BUTTON_COUNT]
  );

  const additionalContext: SecurityAlertsTableContext = useMemo(
    () => ({
      rowRenderers: defaultRowRenderers,
      isDetails: false,
      truncate: true,
      isDraggable: false,
      leadingControlColumn,
      userProfiles,
      tableType,
      pageScope,
      openDocumentFlyout,
    }),
    [leadingControlColumn, pageScope, openDocumentFlyout, tableType, userProfiles]
  );

  const refreshAlertsTable = useCallback(() => {
    alertsTableRef.current?.refresh();
  }, [alertsTableRef]);

  const fieldsBrowserOptions = useAlertsTableFieldsBrowserOptions(
    pageScope,
    alertsTableRef.current?.toggleColumn
  );
  const cellActionsOptions = useCellActionsOptions(tableType, tableContext);
  const bulkActions = useBulkActionsByTableType(
    tableType,
    finalBoolQuery,
    refreshAlertsTable,
    runtimeMappings,
    // A host's `query` (e.g. a case's attached alert ids) replaces finalBoolQuery on the table.
    tablePropsOverrides.query ?? finalBoolQuery
  );

  useEffect(() => {
    if (isDataTableInitialized) return;
    dispatch(
      dataTableActions.initializeDataTableSettings({
        id: tableType,
        title: i18n.SESSIONS_TITLE,
        defaultColumns: finalColumns.map((c) => ({
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...c,
        })),
      })
    );
    dispatch(
      updateItemsPerPage({ id: tableType, itemsPerPage: ALERTS_TABLE_DEFAULT_ITEMS_PER_PAGE })
    );
  }, [dispatch, tableType, finalColumns, isDataTableInitialized]);

  const toolbarVisibility = useMemo(
    () => ({
      showColumnSelector: !isEventRenderedView,
      showSortSelector: !isEventRenderedView,
    }),
    [isEventRenderedView]
  );

  const services = useMemo(
    () => ({
      data,
      http,
      notifications,
      rendering,
      fieldFormats,
      application,
      licensing,
      settings,
      cases,
      agentBuilder,
    }),
    [
      application,
      data,
      fieldFormats,
      http,
      licensing,
      notifications,
      rendering,
      settings,
      cases,
      agentBuilder,
    ]
  );

  /**
   * if records are too less, we don't want table to be of fixed height.
   * it should shrink to the content height.
   * Height setting enables/disables virtualization depending on fixed/undefined height values respectively.
   * */
  const alertTableHeight = useMemo(
    () =>
      isEventRenderedView
        ? `${DEFAULT_DATA_GRID_HEIGHT}px`
        : /*
         * We keep fixed height in Event rendered because of the row height issue
         * as mentioned here
         */
        count > 20
        ? `${DEFAULT_DATA_GRID_HEIGHT}px`
        : undefined,
    [count, isEventRenderedView]
  );

  const onLoaded = useCallback(({ alerts }: { alerts: Alert[] }) => onLoad(alerts), [onLoad]);

  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const pathway =
    tableType === TableId.alertsOnRuleDetailsPage
      ? ('bulk_alerts_rule_details' as const)
      : ('bulk_alerts_alerts_page' as const);
  const bulkAddToChatConfig = useBulkAddToChatConfig(pathway);

  /**
   * We want to hide additional controls (like grouping) if the table is being rendered
   * in the cases page OR if the user of the table explicitly set `disableAdditionalToolbarControls`
   * to true
   */
  const shouldRenderAdditionalToolbarControls =
    disableAdditionalToolbarControls || tableType === TableId.alertsOnCasePage;

  if (isLoading) {
    return null;
  }

  return (
    <FullWidthFlexGroupTable gutterSize="none">
      <StatefulEventContext.Provider value={activeStatefulEventContext}>
        <EuiDataGridContainer hideLastPage={false}>
          <AlertTableCellContextProvider tableId={tableType} sourcererScope={pageScope}>
            <ResponseOpsAlertsTable<SecurityAlertsTableContext>
              key={isEventRenderedView ? 'eventRenderedView' : 'defaultView'}
              ref={alertsTableRef}
              // Stores separate configuration based on the view of the table
              id={id ?? `detection-engine-alert-table-${tableType}-${tableView}`}
              ruleTypeIds={SECURITY_SOLUTION_RULE_TYPE_IDS}
              consumers={ALERT_TABLE_CONSUMERS}
              projectRouting={PROJECT_ROUTING.ORIGIN}
              query={finalBoolQuery}
              sort={liftedSort}
              onSortChange={setLiftedSort}
              casesConfiguration={casesConfiguration}
              gridStyle={gridStyle}
              shouldHighlightRow={shouldHighlightRow}
              rowHeightsOptions={rowHeightsOptions}
              columns={finalColumns}
              browserFields={finalBrowserFields}
              onUpdate={onUpdate}
              onLoaded={onLoaded}
              additionalContext={additionalContext}
              height={alertTableHeight}
              isMutedAlertsEnabled={false}
              pageSize={reduxItemsPerPage}
              onPageSizeChange={onPageSizeChange}
              pageIndex={tablePageIndex}
              onPageIndexChange={setTablePageIndex}
              expandedAlertIndex={flyoutDocumentIndex}
              renderExpandedAlertView={null}
              runtimeMappings={runtimeMappings}
              toolbarVisibility={toolbarVisibility}
              renderCellValue={CellValue}
              renderActionsCell={ActionsCell}
              renderAdditionalToolbarControls={
                shouldRenderAdditionalToolbarControls ? undefined : AdditionalToolbarControls
              }
              actionsColumnWidth={leadingControlColumn.width}
              additionalBulkActions={bulkActions}
              fieldsBrowserOptions={
                DETECTIONS_TABLE_IDS.some((tableId) => tableId === tableType)
                  ? fieldsBrowserOptions
                  : undefined
              }
              cellActionsOptions={cellActionsOptions}
              showInspectButton
              showCsvExportButton
              kibanaVersion={KibanaServices.getKibanaVersion()}
              services={services}
              bulkAddToChatConfig={isAgentBuilderEnabled ? bulkAddToChatConfig : undefined}
              {...tablePropsOverrides}
            />
          </AlertTableCellContextProvider>
        </EuiDataGridContainer>
      </StatefulEventContext.Provider>
    </FullWidthFlexGroupTable>
  );
};

const getDocumentIdentity = (alert: Alert): Partial<ScopedPaginationSlice> => ({
  flyoutDocumentId: alert._id,
  flyoutDocumentIndexName: alert._index,
});

export const AlertsTable = memo(AlertsTableComponent);
