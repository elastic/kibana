/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
} from '@elastic/eui';

import type { RuleExecutionEvent } from '../../../../../common/api/detection_engine/rule_monitoring';

import { HeaderSection } from '../../../../common/components/header_section';
import { EventTypeFilter } from '../basic/filters/event_type_filter';
import { LogLevelFilter } from '../basic/filters/log_level_filter';
import { ExecutionEventsTableDetailsCell } from './execution_events_table_row_details';

import { useFilters } from './use_filters';
import { useSorting } from '../basic/tables/use_sorting';
import { usePagination } from '../basic/tables/use_pagination';
import { useColumns } from './use_columns';
import { useExpandableRows } from '../basic/tables/use_expandable_rows';
import { useExecutionEvents } from './use_execution_events';
import { EventMessageFilter } from './event_message_filter';

import * as i18n from './translations';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

const tableRowProps = {
  'data-test-subj': 'executionEventsTableRow',
};

interface ExecutionEventsTableProps {
  ruleId: string;
}

const ExecutionEventsTableComponent: React.FC<ExecutionEventsTableProps> = ({ ruleId }) => {
  const getItemId = useCallback((item: RuleExecutionEvent): string => {
    return `${item.timestamp} ${item.sequence}`;
  }, []);

  const renderExpandedItem = useCallback((item: RuleExecutionEvent) => {
    return <ExecutionEventsTableDetailsCell item={item} />;
  }, []);

  const rows = useExpandableRows<RuleExecutionEvent>({
    getItemId,
    renderItem: renderExpandedItem,
  });

  const columns = useColumns({
    toggleRowExpanded: rows.toggleRowExpanded,
    isRowExpanded: rows.isRowExpanded,
  });

  const filters = useFilters();
  const sorting = useSorting<RuleExecutionEvent>('timestamp', 'desc');
  const pagination = usePagination<RuleExecutionEvent>({ pageSizeOptions: PAGE_SIZE_OPTIONS });

  const executionEvents = useExecutionEvents({
    ruleId,
    searchTerm: filters.state.searchTerm,
    eventTypes: filters.state.eventTypes,
    logLevels: filters.state.logLevels,
    dateRange: filters.state.dateRange,
    sortOrder: sorting.state.sort.direction,
    page: pagination.state.pageNumber,
    perPage: pagination.state.pageSize,
  });

  // Each time execution events are fetched
  useEffect(() => {
    // We need to update total item count for the pagination to work properly
    pagination.updateTotalItemCount(executionEvents.data?.pagination.total);
  }, [executionEvents, pagination]);

  const items = useMemo(() => executionEvents.data?.events ?? [], [executionEvents.data]);

  const handleTableChange = useCallback(
    (criteria: CriteriaWithPagination<RuleExecutionEvent>): void => {
      sorting.update(criteria);
      pagination.update(criteria);
    },
    [sorting, pagination]
  );

  return (
    <EuiPanel hasBorder>
      {/* Filter bar */}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={i18n.TABLE_TITLE} subtitle={i18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EventMessageFilter onSearch={filters.setSearchTerm} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogLevelFilter selectedItems={filters.state.logLevels} onChange={filters.setLogLevels} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EventTypeFilter
            selectedItems={filters.state.eventTypes}
            onChange={filters.setEventTypes}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={filters.state.dateRange.start}
            end={filters.state.dateRange.end}
            onTimeChange={filters.setDateRange}
            showUpdateButton={false}
            data-test-subj="executionEventsTable-datePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Table with items */}
      <EuiBasicTable
        data-test-subj="executionEventsTable"
        columns={columns}
        items={items}
        itemId={getItemId}
        itemIdToExpandedRowMap={rows.itemIdToExpandedRowMap}
        loading={executionEvents.isFetching}
        sorting={sorting.state}
        pagination={pagination.state}
        onChange={handleTableChange}
        tableCaption={i18n.TABLE_SUBTITLE}
        rowProps={tableRowProps}
      />
    </EuiPanel>
  );
};

export const ExecutionEventsTable = React.memo(ExecutionEventsTableComponent);
ExecutionEventsTable.displayName = 'RuleExecutionEventsTable';
