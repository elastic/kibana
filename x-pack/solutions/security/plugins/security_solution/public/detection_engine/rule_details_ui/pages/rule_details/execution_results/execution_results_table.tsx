/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';
import { getColumns } from './columns';
import { useFilterByExecutionId } from './use_filter_by_execution_id';
import {
  ExecutionRunTypeFilter,
  ExecutionStatusFilter,
  useReadExecutionResults,
} from '../../../../rule_monitoring';
import { ExecutionDetailsFlyout } from './flyout/execution_details_flyout';
import { HeaderSection } from '../../../../../common/components/header_section';
import {
  RUN_TYPE_FILTERS,
  STATUS_FILTERS,
} from '../../../../../../common/detection_engine/rule_management/execution_log';
import type { SortOrder } from '../../../../../../common/api/detection_engine';
import type {
  RuleExecutionStatus,
  RuleRunType,
  UnifiedExecutionResult,
  UnifiedExecutionResultSortField,
  UnifiedExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

const RULE_STATUS_TO_UNIFIED: Partial<Record<RuleExecutionStatus, UnifiedExecutionStatus>> = {
  succeeded: 'success',
  'partial failure': 'warning',
  failed: 'failure',
};

interface ExecutionResultsTableProps {
  ruleId: string;
  navigateToAlertsTab: () => void;
}

export const ExecutionResultsTable: React.FC<ExecutionResultsTableProps> = ({
  ruleId,
  navigateToAlertsTab,
}) => {
  const onFilterByExecutionId = useFilterByExecutionId(navigateToAlertsTab);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [selectedItem, setSelectedItem] = useState<UnifiedExecutionResult | null>(null);
  const [sortField, setSortField] = useState<UnifiedExecutionResultSortField>('execution_start');
  const [sortDirection, setSortDirection] = useState<SortOrder>('desc');

  const [start, setStart] = useState('now-2h');
  const [end, setEnd] = useState('now');

  const [runTypeFilters, setRunTypeFilters] = useState<RuleRunType[]>([]);

  const [statusFilters, setStatusFilters] = useState<RuleExecutionStatus[]>([]);
  const finalStatusFilters = useMemo(
    () =>
      statusFilters
        .map((status) => RULE_STATUS_TO_UNIFIED[status])
        .filter((status): status is UnifiedExecutionStatus => status !== undefined),
    [statusFilters]
  );

  const { data, isFetching, refetch } = useReadExecutionResults({
    ruleId,
    filter: {
      from: start,
      to: end,
      outcome: finalStatusFilters,
      run_type: runTypeFilters,
    },
    sort: { field: sortField, order: sortDirection },
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const tableItems = data?.data ?? [];
  const totalItemCount = data?.total ?? 0;

  const onTimeChangeCallback = useCallback(
    ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
      setStart(newStart);
      setEnd(newEnd);
    },
    []
  );

  const onRefreshCallback = useCallback(() => {
    refetch();
  }, [refetch]);

  const onTableChangeCallback = useCallback(
    ({ page, sort }: CriteriaWithPagination<UnifiedExecutionResult>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
      if (sort) {
        setSortField(sort.field as UnifiedExecutionResultSortField);
        setSortDirection(sort.direction);
      }
    },
    []
  );

  const columns = useMemo(
    () => getColumns({ onFilterByExecutionId, onViewDetails: setSelectedItem }),
    [onFilterByExecutionId]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [5, 10, 25],
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const sorting = useMemo(
    () => ({ sort: { field: sortField, direction: sortDirection } }),
    [sortField, sortDirection]
  );

  return (
    <EuiPanel hasBorder data-test-subj="executionResultsContainer">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={i18n.TABLE_TITLE} subtitle={i18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={true}>
              <ExecutionRunTypeFilter
                items={RUN_TYPE_FILTERS}
                selectedItems={runTypeFilters}
                onChange={setRunTypeFilters}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <ExecutionStatusFilter
                items={STATUS_FILTERS}
                selectedItems={statusFilters}
                onChange={setStatusFilters}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onTimeChangeCallback}
            onRefresh={onRefreshCallback}
            isLoading={isFetching}
            width="auto"
            data-test-subj="executionResultsDatePicker"
            css={css`
              .euiPopover {
                /* Make sure time value buttons don't get cut off */
                overflow: visible;
              }
            `}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiBasicTable
        data-test-subj="executionResultsTable"
        tableCaption={i18n.TABLE_SUBTITLE}
        items={tableItems}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        loading={isFetching}
        onChange={onTableChangeCallback}
      />
      {selectedItem && (
        <ExecutionDetailsFlyout item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </EuiPanel>
  );
};
