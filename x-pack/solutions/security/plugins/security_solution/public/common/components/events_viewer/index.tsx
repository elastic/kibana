/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { SubsetDataTableModel, TableId } from '@kbn/securitysolution-data-table';
import {
  dataTableActions,
  DataTableComponent,
  defaultHeaders,
  getEventIdToDataMapping,
} from '@kbn/securitysolution-data-table';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import { ThemeContext } from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type {
  ColumnHeaderOptions,
  DeprecatedCellValueElementProps,
  DeprecatedRowRenderer,
  Direction,
  EntityType,
} from '@kbn/timelines-plugin/common';
import { isEmpty } from 'lodash';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { InspectButton } from '../inspect';
import type {
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../common/types';
import type { RowRenderer, SortColumnTimeline as Sort } from '../../../../common/types/timeline';
import { InputsModelId } from '../../store/inputs/constants';
import type { State } from '../../store';
import { inputsActions } from '../../store/actions';
import { eventsViewerSelector } from './selectors';
import type { SourcererScopeName } from '../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../sourcerer/containers';
import type { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { useKibana } from '../../lib/kibana';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import type { FieldEditorActions } from '../../../timelines/components/fields_browser';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import {
  useSessionView,
  useSessionViewNavigation,
} from '../../../timelines/components/timeline/tabs/session/use_session_view';
import { getCombinedFilterQuery } from './helpers';
import { useTimelineEvents } from './use_timelines_events';
import { EmptyTable, TableContext, TableLoading } from './shared';
import { useQueryInspector } from '../page/manage_query';
import type { SetQuery } from '../../containers/use_global_time/types';
import { checkBoxControlColumn, transformControlColumns } from '../control_columns';
import { useAlertBulkActions } from './use_alert_bulk_actions';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { StatefulEventContext } from './stateful_event_context';
import { defaultUnit } from '../toolbar/unit';
import { useGetFieldSpec } from '../../hooks/use_get_field_spec';

const SECURITY_ALERTS_CONSUMERS = [AlertConsumers.SIEM];

export interface EventsViewerProps {
  bulkActions: boolean | BulkActionsProp;
  cellActionsTriggerId?: string;
  defaultModel: SubsetDataTableModel;
  end: string;
  entityType?: EntityType;
  indexNames?: string[];
  leadingControlColumns: ControlColumnProps[];
  pageFilters?: Filter[];
  renderCellValue: React.FC<CellValueElementProps>;
  rowRenderers: RowRenderer[];
  sourcererScope: SourcererScopeName;
  start: string;
  tableId: TableId;
  topRightMenuOptions?: React.ReactNode;
  unit?: (n: number) => string;
}

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<EventsViewerProps & PropsFromRedux> = ({
  bulkActions,
  cellActionsTriggerId,
  clearSelected,
  defaultModel,
  end,
  entityType = 'events',
  indexNames,
  leadingControlColumns,
  pageFilters,
  renderCellValue,
  rowRenderers,
  setSelected,
  sourcererScope,
  start,
  tableId,
  topRightMenuOptions,
  unit = defaultUnit,
}) => {
  const dispatch = useDispatch();
  const theme: EuiTheme = useContext(ThemeContext);
  const tableContext = useMemo(() => ({ tableId }), [tableId]);

  const {
    filters,
    query,
    dataTable: {
      columns,
      defaultColumns,
      deletedEventIds,
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      itemsPerPage,
      itemsPerPageOptions,
      sessionViewConfig,
      showCheckboxes,
      sort,
      queryFields,
      selectAll,
      selectedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      title,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));
  const inspectModalTitle = useMemo(() => <span data-test-subj="title">{title}</span>, [title]);

  const { uiSettings, data } = useKibana().services;

  const {
    browserFields,
    dataViewId,
    selectedPatterns,
    sourcererDataView,
    dataViewId: selectedDataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(sourcererScope);

  const getFieldSpec = useGetFieldSpec(sourcererScope);

  const editorActionsRef = useRef<FieldEditorActions>(null);
  useEffect(() => {
    dispatch(
      dataTableActions.createDataTable({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: tableId,
        indexNames: indexNames ?? selectedPatterns,
        itemsPerPage,
        showCheckboxes,
        sort,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ id: tableId, inputId: InputsModelId.global }));
      if (editorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        editorActionsRef.current.closeEditor();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);

  // TODO remove this when session view is fully migrated to the flyout and the advanced settings is removed
  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });
  const { SessionView } = useSessionView({
    scopeId: tableId,
  });
  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      dispatch(
        inputsActions.setQuery({
          id,
          inputId: InputsModelId.global,
          inspect,
          loading,
          refetch,
        })
      ),
    [dispatch]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope,
    editorActionsRef,
    upsertColumn: useCallback(
      (column: ColumnHeaderOptions, index: number) =>
        dispatch(dataTableActions.upsertColumn({ column, id: tableId, index })),
      [dispatch, tableId]
    ),
    removeColumn: useCallback(
      (columnId: string) => dispatch(dataTableActions.removeColumn({ columnId, id: tableId })),
      [dispatch, tableId]
    ),
  });

  const columnHeaders = isEmpty(columns) ? defaultHeaders : columns;
  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders: [],
        filters: globalFilters,
        from: start,
        indexPattern: sourcererDataView,
        kqlMode: 'filter',
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, browserFields, globalFilters, start, sourcererDataView, query, end]
  );

  const canQueryTimeline = useMemo(
    () =>
      filterQuery != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, filterQuery, start, end]
  );

  const fields = useMemo(
    () => [...columnHeaders.map((c: { id: string }) => c.id), ...(queryFields ?? [])],
    [columnHeaders, queryFields]
  );

  const sortField = useMemo(
    () =>
      (sort as Sort[]).map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );

  const [loading, { events, loadPage, pageInfo, refetch, totalCount = 0, inspect }] =
    useTimelineEvents({
      // We rely on entityType to determine Events vs Alerts
      alertConsumers: SECURITY_ALERTS_CONSUMERS,
      data,
      dataViewId,
      endDate: end,
      entityType,
      fields,
      filterQuery,
      id: tableId,
      indexNames: indexNames ?? selectedPatterns,
      limit: itemsPerPage,
      runtimeMappings: sourcererDataView.runtimeFieldMap as RunTimeMappings,
      skip: !canQueryTimeline,
      sort: sortField,
      startDate: start,
      filterStatus: undefined,
    });

  useEffect(() => {
    dispatch(dataTableActions.updateIsLoading({ id: tableId, isLoading: loading }));
  }, [dispatch, tableId, loading]);

  const deleteQuery = useCallback(
    ({ id }: { id: string }) =>
      dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id })),
    [dispatch]
  );

  useQueryInspector({
    queryId: tableId,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const hasAlerts = totalCountMinusDeleted > 0;

  // Only show the table-spanning loading indicator when the query is loading and we
  // don't have data (e.g. for the initial fetch).
  // Subsequent fetches (e.g. for pagination) will show a small loading indicator on
  // top of the table and the table will display the current page until the next page
  // is fetched. This prevents a flicker when paginating.
  const showFullLoading = loading && !hasAlerts;

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );
  useEffect(() => {
    setQuery({ id: tableId, inspect, loading, refetch });
  }, [inspect, loading, refetch, setQuery, tableId]);

  // Clear checkbox selection when new events are fetched
  useEffect(() => {
    dispatch(dataTableActions.clearSelected({ id: tableId }));
    dispatch(
      dataTableActions.setDataTableSelectAll({
        id: tableId,
        selectAll: false,
      })
    );
  }, [nonDeletedEvents, dispatch, tableId]);

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage: number) => {
      dispatch(
        dataTableActions.updateItemsPerPage({ id: tableId, itemsPerPage: itemsChangedPerPage })
      );
    },
    [tableId, dispatch]
  );

  const onChangePage = useCallback(
    (page: number) => {
      loadPage(page);
    },
    [loadPage]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(dataTableActions.setEventsLoading({ id: tableId, eventIds, isLoading }));
    },
    [dispatch, tableId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(dataTableActions.setEventsDeleted({ id: tableId, eventIds, isDeleted }));
    },
    [dispatch, tableId]
  );

  const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

  const onRowSelected: OnRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
      setSelected({
        id: tableId,
        eventIds: getEventIdToDataMapping(nonDeletedEvents, eventIds, queryFields, true),
        isSelected,
        isSelectAllChecked: isSelected && selectedCount + 1 === nonDeletedEvents.length,
      });
    },
    [setSelected, tableId, nonDeletedEvents, queryFields, selectedCount]
  );

  const onSelectPage: OnSelectAll = useCallback(
    ({ isSelected }: { isSelected: boolean }) =>
      isSelected
        ? setSelected({
            id: tableId,
            eventIds: getEventIdToDataMapping(
              nonDeletedEvents,
              nonDeletedEvents.map((event) => event._id),
              queryFields,
              true
            ),
            isSelected,
            isSelectAllChecked: isSelected,
          })
        : clearSelected({ id: tableId }),
    [setSelected, tableId, nonDeletedEvents, queryFields, clearSelected]
  );

  // Sync to selectAll so parent components can select all events
  useEffect(() => {
    if (selectAll && !isSelectAllChecked) {
      onSelectPage({ isSelected: true });
    }
  }, [isSelectAllChecked, onSelectPage, selectAll]);

  const [transformedLeadingControlColumns] = useMemo(() => {
    return [
      showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
    ].map((controlColumns) =>
      transformControlColumns({
        columnHeaders,
        controlColumns,
        data: nonDeletedEvents,
        fieldBrowserOptions,
        loadingEventIds,
        onRowSelected,
        onRuleChange: undefined,
        selectedEventIds,
        showCheckboxes,
        tabType: 'query',
        timelineId: tableId,
        isSelectAllChecked,
        sort,
        browserFields,
        onSelectPage,
        theme,
        setEventsLoading,
        setEventsDeleted,
        pageSize: itemsPerPage,
      })
    );
  }, [
    showCheckboxes,
    leadingControlColumns,
    columnHeaders,
    nonDeletedEvents,
    fieldBrowserOptions,
    loadingEventIds,
    onRowSelected,
    selectedEventIds,
    tableId,
    isSelectAllChecked,
    sort,
    browserFields,
    onSelectPage,
    theme,
    setEventsLoading,
    setEventsDeleted,
    itemsPerPage,
  ]);

  const alertBulkActions = useAlertBulkActions({
    tableId,
    data: nonDeletedEvents,
    totalItems: totalCountMinusDeleted,
    hasAlertsCrud: true,
    showCheckboxes,
    filterStatus: undefined,
    filterQuery,
    bulkActions,
    selectedCount,
  });

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: tableId,
    tabType: 'query',
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
  });

  const unitCountText = useMemo(
    () => `${totalCountMinusDeleted.toLocaleString()} ${unit(totalCountMinusDeleted)}`,
    [totalCountMinusDeleted, unit]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: pageInfo.activePage,
      pageSize: itemsPerPage,
      pageSizeOptions: itemsPerPageOptions,
      onChangeItemsPerPage,
      onChangePage,
    }),
    [itemsPerPage, itemsPerPageOptions, onChangeItemsPerPage, onChangePage, pageInfo.activePage]
  );

  return (
    <div data-test-subj="events-viewer-panel">
      {showFullLoading && <TableLoading height="short" />}

      {graphOverlay}

      {canQueryTimeline && (
        <TableContext.Provider value={tableContext}>
          <div
            data-timeline-id={tableId}
            data-test-subj={`events-container-loading-${loading}`}
            css={css`
              position: relative;
            `}
          >
            {!loading && !graphOverlay && (
              <div
                css={css`
                  position: absolute;
                  top: ${theme.eui.euiSizeXS};
                  z-index: ${theme.eui.euiZLevel1 - 3};
                  right: ${nonDeletedEvents.length > 0 ? '72px' : theme.eui.euiSizeXS};
                `}
              >
                <EuiFlexGroup data-test-subj="events-viewer-updated" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <InspectButton title={inspectModalTitle} queryId={tableId} />
                  </EuiFlexItem>
                  {topRightMenuOptions && (
                    <EuiFlexItem grow={false}>{topRightMenuOptions}</EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </div>
            )}

            {!hasAlerts && !loading && !graphOverlay && <EmptyTable />}

            {hasAlerts && (
              <EuiFlexItem
                css={css`
                  display: ${!graphEventId && graphOverlay == null ? 'flex' : 'none'};
                  overflow: auto;
                `}
              >
                <StatefulEventContext.Provider value={activeStatefulEventContext}>
                  <DataTableComponent
                    additionalControls={alertBulkActions}
                    browserFields={browserFields}
                    bulkActions={bulkActions}
                    data={nonDeletedEvents}
                    fieldBrowserOptions={fieldBrowserOptions}
                    id={tableId}
                    leadingControlColumns={transformedLeadingControlColumns}
                    loadPage={loadPage}
                    // TODO: migrate away from deprecated type
                    renderCellValue={
                      renderCellValue as (props: DeprecatedCellValueElementProps) => React.ReactNode
                    }
                    // TODO: migrate away from deprecated type
                    rowRenderers={rowRenderers as unknown as DeprecatedRowRenderer[]}
                    unitCountText={unitCountText}
                    pagination={pagination}
                    totalItems={totalCountMinusDeleted}
                    getFieldSpec={getFieldSpec}
                    cellActionsTriggerId={cellActionsTriggerId}
                  />
                </StatefulEventContext.Provider>
              </EuiFlexItem>
            )}
          </div>
        </TableContext.Provider>
      )}
    </div>
  );
};

const mapDispatchToProps = {
  clearSelected: dataTableActions.clearSelected,
  setSelected: dataTableActions.setSelected,
};

const connector = connect(undefined, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer: React.FunctionComponent<EventsViewerProps> = connector(
  StatefulEventsViewerComponent
);
