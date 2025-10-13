/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import moment from 'moment';
import type {
  CriteriaWithPagination,
  EuiSwitchEvent,
  OnRefreshChangeProps,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import { PageScope } from '../../../../../data_view_manager/constants';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import {
  RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY,
  RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_SOURCE_EVENT_TIME_RANGE_STORAGE_KEY,
} from '../../../../../../common/constants';
import type {
  RuleExecutionResult,
  RuleExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';
import { RuleDetailTabs } from '../use_rule_details_tabs';
import { HeaderSection } from '../../../../../common/components/header_section';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../../common/store';
import {
  setAbsoluteRangeDatePicker,
  setFilterQuery,
  setRelativeRangeDatePicker,
} from '../../../../../common/store/inputs/actions';
import type {
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../../../../common/store/inputs/model';
import { isAbsoluteTimeRange, isRelativeTimeRange } from '../../../../../common/store/inputs/model';
import { useExecutionResults } from '../../../../rule_monitoring';
import { useRuleDetailsContext } from '../rule_details_context';
import { useExpandableRows } from '../../../../rule_monitoring/components/basic/tables/use_expandable_rows';
import { TextBlock } from '../../../../rule_monitoring/components/basic/text/text_block';
import * as i18n from './translations';
import {
  EXECUTION_LOG_COLUMNS,
  expanderColumn,
  getExecutionLogMetricsColumns,
  getMessageColumn,
  getSourceEventTimeRangeColumns,
} from './execution_log_columns';
import { ExecutionLogSearchBar } from './execution_log_search_bar';
import { EventLogEventTypes } from '../../../../../common/lib/telemetry';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

const EXECUTION_UUID_FIELD_NAME = 'kibana.alert.rule.execution.uuid';

const UtilitySwitch = styled(EuiSwitch)`
  margin-left: 17px;
`;

const DatePickerEuiFlexItem = styled(EuiFlexItem)`
  max-width: 582px;
`;

interface StartServices {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
}

interface ExecutionLogTableProps extends StartServices {
  ruleId: string;
  selectAlertsTab: () => void;
}

interface CachedGlobalQueryState {
  filters: Filter[];
  query: Query;
  timerange: AbsoluteTimeRange | RelativeTimeRange;
}

const ExecutionLogTableComponent: React.FC<ExecutionLogTableProps> = ({
  ruleId,
  selectAlertsTab,
  ...startServices
}) => {
  const {
    docLinks,
    data: {
      query: { filterManager },
    },
    storage,
    timelines,
    telemetry,
  } = useKibana().services;

  const {
    [RuleDetailTabs.executionResults]: {
      state: {
        superDatePicker: { recentlyUsedRanges, refreshInterval, isPaused, start, end },
        queryText,
        statusFilters,
        runTypeFilters,
        showMetricColumns,
        showSourceEventTimeRange,
        pagination: { pageIndex, pageSize },
        sort: { sortField, sortDirection },
      },
      actions: {
        setEnd,
        setIsPaused,
        setPageIndex,
        setPageSize,
        setQueryText,
        setRecentlyUsedRanges,
        setRefreshInterval,
        setShowMetricColumns,
        setSortDirection,
        setSortField,
        setStart,
        setStatusFilters,
        setRunTypeFilters,
        setShowSourceEventTimeRange,
      },
    },
  } = useRuleDetailsContext();

  const { dataView } = useDataView(PageScope.alerts);

  const { addError, addSuccess, remove } = useAppToasts();

  // QueryString, Filters, and TimeRange state
  const dispatch = useDispatch();
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const timerange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const cachedGlobalQueryState = useRef<CachedGlobalQueryState>({ filters, query, timerange });
  const successToastId = useRef('');

  const resetGlobalQueryState = useCallback(() => {
    if (isAbsoluteTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          to: cachedGlobalQueryState.current.timerange.to,
        })
      );
    } else if (isRelativeTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setRelativeRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          fromStr: cachedGlobalQueryState.current.timerange.fromStr,
          to: cachedGlobalQueryState.current.timerange.to,
          toStr: cachedGlobalQueryState.current.timerange.toStr,
        })
      );
    }

    dispatch(
      setFilterQuery({
        id: InputsModelId.global,
        query: cachedGlobalQueryState.current.query.query,
        language: cachedGlobalQueryState.current.query.language,
      })
    );
    // Using filterManager directly as dispatch(setSearchBarFilter()) was not replacing filters
    filterManager.removeAll();
    filterManager.addFilters(cachedGlobalQueryState.current.filters);
    remove(successToastId.current);
  }, [dispatch, filterManager, remove]);

  // Table data state
  const {
    data: events,
    dataUpdatedAt,
    isFetching,
    isLoading,
    refetch,
  } = useExecutionResults({
    ruleId,
    start,
    end,
    queryText,
    statusFilters,
    runTypeFilters,
    page: pageIndex,
    perPage: pageSize,
    sortField,
    sortOrder: sortDirection,
  });
  const items = events?.events ?? [];
  const maxEvents = events?.total ?? 0;

  // Cache UUID field from data view as it can be expensive to iterate all data view fields
  const uuidDataViewField = useMemo(
    () => dataView.fields?.getByName(EXECUTION_UUID_FIELD_NAME),
    [dataView]
  );

  // Callbacks
  const onTableChangeCallback = useCallback(
    ({ page, sort }: CriteriaWithPagination<RuleExecutionResult>) => {
      const { index, size } = page;
      setPageIndex(index + 1);
      setPageSize(size);
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
      }
    },
    [setPageIndex, setPageSize, setSortDirection, setSortField]
  );

  const onTimeChangeCallback = useCallback(
    (props: OnTimeChangeProps) => {
      const recentlyUsedRange = recentlyUsedRanges.filter((range) => {
        const isDuplicate = range.start === props.start && range.end === props.end;
        return !isDuplicate;
      });
      recentlyUsedRange.unshift({ start: props.start, end: props.end });
      setStart(props.start);
      setEnd(props.end);
      setRecentlyUsedRanges(
        recentlyUsedRange.length > 10 ? recentlyUsedRange.slice(0, 9) : recentlyUsedRange
      );
    },
    [recentlyUsedRanges, setEnd, setRecentlyUsedRanges, setStart]
  );

  const onRefreshChangeCallback = useCallback(
    (props: OnRefreshChangeProps) => {
      setIsPaused(props.isPaused);
      // Only support auto-refresh >= 1minute -- no current ability to limit within component
      setRefreshInterval(props.refreshInterval > 60000 ? props.refreshInterval : 60000);
    },
    [setIsPaused, setRefreshInterval]
  );

  const onRefreshCallback = useCallback(
    (props: OnRefreshProps) => {
      refetch();
    },
    [refetch]
  );

  const onSearchCallback = useCallback(
    (updatedQueryText: string) => {
      setQueryText(updatedQueryText);
    },
    [setQueryText]
  );

  const onStatusFilterChangeCallback = useCallback(
    (updatedStatusFilters: RuleExecutionStatus[]) => {
      setStatusFilters(updatedStatusFilters);
    },
    [setStatusFilters]
  );

  const onFilterByExecutionIdCallback = useCallback(
    (executionId: string, executionStart: string) => {
      if (uuidDataViewField != null && typeof uuidDataViewField !== 'undefined' && dataView) {
        // Update cached global query state with current state as a rollback point
        cachedGlobalQueryState.current = { filters, query, timerange };
        // Create filter & daterange constraints
        const filter = buildFilter(
          dataView,
          uuidDataViewField,
          FILTERS.PHRASE,
          false,
          false,
          executionId,
          null
        );
        dispatch(
          setAbsoluteRangeDatePicker({
            id: InputsModelId.global,
            from: moment(executionStart).subtract(1, 'days').toISOString(),
            to: moment(executionStart).add(1, 'days').toISOString(),
          })
        );
        filterManager.removeAll();
        filterManager.addFilters(filter);
        dispatch(setFilterQuery({ id: InputsModelId.global, query: '', language: 'kuery' }));
        selectAlertsTab();
        successToastId.current = addSuccess(
          {
            title: i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_TITLE,
            text: toMountPoint(
              <>
                <p>{i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_DESCRIPTION}</p>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton size="s" onClick={resetGlobalQueryState}>
                      {i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_RESTORE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>,
              startServices
            ),
          },
          // Essentially keep toast around till user dismisses via 'x'
          { toastLifeTimeMs: 10 * 60 * 1000 }
        ).id;
      } else {
        addError(i18n.ACTIONS_FIELD_NOT_FOUND_ERROR, {
          title: i18n.ACTIONS_FIELD_NOT_FOUND_ERROR_TITLE,
        });
      }
    },
    [
      dataView,
      uuidDataViewField,
      filters,
      query,
      timerange,
      dispatch,
      filterManager,
      selectAlertsTab,
      addSuccess,
      resetGlobalQueryState,
      startServices,
      addError,
    ]
  );

  const onShowSourceEventTimeRange = useCallback(
    (showEventTimeRange: boolean) => {
      storage.set(
        RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_SOURCE_EVENT_TIME_RANGE_STORAGE_KEY,
        showEventTimeRange
      );
      setShowSourceEventTimeRange(showEventTimeRange);
    },
    [setShowSourceEventTimeRange, storage]
  );

  const onShowMetricColumnsCallback = useCallback(
    (showMetrics: boolean) => {
      storage.set(RULE_DETAILS_EXECUTION_LOG_TABLE_SHOW_METRIC_COLUMNS_STORAGE_KEY, showMetrics);
      setShowMetricColumns(showMetrics);
    },
    [setShowMetricColumns, storage]
  );

  // Memoized state
  const pagination = useMemo(() => {
    return {
      pageIndex: pageIndex - 1,
      pageSize,
      totalItemCount:
        maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED ? MAX_EXECUTION_EVENTS_DISPLAYED : maxEvents,
      pageSizeOptions: [5, 10, 25, 50],
    };
  }, [maxEvents, pageIndex, pageSize]);

  const sorting = useMemo(() => {
    return {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };
  }, [sortDirection, sortField]);

  const actions = useMemo(
    () => [
      {
        field: EXECUTION_UUID_FIELD_NAME,
        name: i18n.COLUMN_ACTIONS,
        width: '64px',
        actions: [
          {
            name: 'Edit',
            isPrimary: true,
            field: '',
            description: i18n.COLUMN_ACTIONS_TOOLTIP,
            icon: 'filter',
            type: 'icon',
            onClick: (executionEvent: RuleExecutionResult) => {
              if (executionEvent?.execution_uuid) {
                onFilterByExecutionIdCallback(
                  executionEvent.execution_uuid,
                  executionEvent.timestamp
                );
              }
            },
            'data-test-subj': 'action-filter-by-execution-id',
          },
        ],
      },
    ],
    [onFilterByExecutionIdCallback]
  );

  const getItemId = useCallback((item: RuleExecutionResult): string => {
    return `${item.execution_uuid}`;
  }, []);

  const renderExpandedItem = useCallback(
    (item: RuleExecutionResult) => (
      <EuiDescriptionList
        className="eui-fullWidth"
        listItems={[
          {
            title: i18n.ROW_DETAILS_MESSAGE,
            description: <TextBlock text={item.security_message} />,
          },
        ]}
      />
    ),
    []
  );

  const rows = useExpandableRows<RuleExecutionResult>({
    getItemId,
    renderItem: renderExpandedItem,
  });

  const handleShowSourceEventTimeRange = useCallback(
    (e: EuiSwitchEvent) => {
      const isVisible = e.target.checked;
      onShowSourceEventTimeRange(isVisible);
      telemetry.reportEvent(EventLogEventTypes.EventLogShowSourceEventDateRange, {
        isVisible,
      });
    },
    [onShowSourceEventTimeRange, telemetry]
  );

  const executionLogColumns = useMemo(() => {
    const columns = [...EXECUTION_LOG_COLUMNS];
    let messageColumnWidth = 50;

    if (showSourceEventTimeRange) {
      columns.push(...getSourceEventTimeRangeColumns());
      messageColumnWidth = 30;
    }

    if (showMetricColumns) {
      messageColumnWidth = 20;
      columns.push(
        getMessageColumn(`${messageColumnWidth}%`),
        ...getExecutionLogMetricsColumns(docLinks)
      );
    } else {
      columns.push(getMessageColumn(`${messageColumnWidth}%`));
    }

    columns.push(
      ...actions,
      expanderColumn({
        toggleRowExpanded: rows.toggleRowExpanded,
        isRowExpanded: rows.isRowExpanded,
      })
    );

    return columns;
  }, [
    actions,
    docLinks,
    showMetricColumns,
    showSourceEventTimeRange,
    rows.toggleRowExpanded,
    rows.isRowExpanded,
  ]);

  return (
    <EuiPanel data-test-subj="executionLogContainer" hasBorder>
      {/* Filter bar */}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={i18n.TABLE_TITLE} subtitle={i18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExecutionLogSearchBar
            onlyShowFilters={true}
            selectedStatuses={statusFilters}
            onStatusFilterChange={onStatusFilterChangeCallback}
            onSearch={onSearchCallback}
            selectedRunTypes={runTypeFilters}
            onRunTypeFilterChange={setRunTypeFilters}
          />
        </EuiFlexItem>
        <DatePickerEuiFlexItem>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onTimeChangeCallback}
            onRefresh={onRefreshCallback}
            isPaused={isPaused}
            isLoading={isFetching}
            refreshInterval={refreshInterval}
            onRefreshChange={onRefreshChangeCallback}
            recentlyUsedRanges={recentlyUsedRanges}
            width="full"
          />
        </DatePickerEuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Utility bar */}
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="executionsShowing">
              {i18n.SHOWING_EXECUTIONS(
                maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED
                  ? MAX_EXECUTION_EVENTS_DISPLAYED
                  : maxEvents
              )}
            </UtilityBarText>
          </UtilityBarGroup>
          {maxEvents > MAX_EXECUTION_EVENTS_DISPLAYED && (
            <UtilityBarGroup grow={true}>
              <UtilityBarText dataTestSubj="exceptionsShowing" shouldWrap={true}>
                <EuiTextColor color="danger">
                  {i18n.RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED(
                    maxEvents,
                    MAX_EXECUTION_EVENTS_DISPLAYED
                  )}
                </EuiTextColor>
              </UtilityBarText>
            </UtilityBarGroup>
          )}
        </UtilityBarSection>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="lastUpdated">
              {timelines.getLastUpdated({
                showUpdating: isLoading || isFetching,
                updatedAt: dataUpdatedAt,
              })}
            </UtilityBarText>
            <UtilitySwitch
              label={i18n.RULE_EXECUTION_LOG_SHOW_SOURCE_EVENT_TIME_RANGE}
              checked={showSourceEventTimeRange}
              compressed={true}
              onChange={handleShowSourceEventTimeRange}
            />
            <UtilitySwitch
              label={i18n.RULE_EXECUTION_LOG_SHOW_METRIC_COLUMNS_SWITCH}
              checked={showMetricColumns}
              compressed={true}
              onChange={(e) => onShowMetricColumnsCallback(e.target.checked)}
            />
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Table with items */}
      <EuiBasicTable
        columns={executionLogColumns}
        items={items}
        loading={isFetching}
        sorting={sorting}
        pagination={pagination}
        onChange={onTableChangeCallback}
        itemId={getItemId}
        itemIdToExpandedRowMap={rows.itemIdToExpandedRowMap}
        data-test-subj="executionsTable"
      />
    </EuiPanel>
  );
};

export const ExecutionLogTable = React.memo(ExecutionLogTableComponent);
ExecutionLogTable.displayName = 'ExecutionLogTable';
