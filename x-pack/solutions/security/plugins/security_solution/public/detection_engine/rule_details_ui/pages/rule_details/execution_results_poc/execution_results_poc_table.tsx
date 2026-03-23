/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { mockResponse } from './static_data';
import * as i18n from './translations';
import * as logTableI18n from '../execution_log_table/translations';
import { ExecutionStatusIndicator } from '../../../../rule_monitoring';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { RuleDurationFormat } from '../execution_log_table/rule_duration_format';
import { ExecutionDetailsFlyout } from './execution_details_flyout';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../common/translations';
import { HeaderSection } from '../../../../../common/components/header_section';
import { ExecutionLogSearchBar } from '../execution_log_table/execution_log_search_bar';
import type {
  RuleExecutionStatus,
  RuleRunType,
  UnifiedExecutionResult,
  UnifiedExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

const datePickerFlexItemCss = css`
  max-width: 582px;
`;

const UNIFIED_TO_RULE_STATUS: Record<UnifiedExecutionStatus, RuleExecutionStatus> = {
  success: 'succeeded',
  warning: 'partial failure',
  failure: 'failed',
};

interface ExecutionResultsPocTableProps {
  ruleId: string;
}

export const ExecutionResultsPocTable: React.FC<ExecutionResultsPocTableProps> = ({ ruleId }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [selectedItem, setSelectedItem] = useState<UnifiedExecutionResult | null>(null);

  const [statusFilters, setStatusFilters] = useState<RuleExecutionStatus[]>([]);
  const [runTypeFilters, setRunTypeFilters] = useState<RuleRunType[]>([]);
  const [start, setStart] = useState('now-24h');
  const [end, setEnd] = useState('now');
  const [isPaused, setIsPaused] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0);

  const onTimeChangeCallback = ({
    start: newStart,
    end: newEnd,
  }: {
    start: string;
    end: string;
  }) => {
    setStart(newStart);
    setEnd(newEnd);
  };

  const onRefreshChangeCallback = ({
    isPaused: newIsPaused,
    refreshInterval: newRefreshInterval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) => {
    setIsPaused(newIsPaused);
    setRefreshInterval(newRefreshInterval);
  };

  const onRefreshCallback = () => {
    // Placeholder for refresh
  };

  const onSearchCallback = () => {
    // Placeholder for search
  };

  const columns: Array<EuiBasicTableColumn<UnifiedExecutionResult>> = [
    {
      field: 'outcome.status',
      name: i18n.COLUMN_STATUS,
      render: (_value: unknown, record: UnifiedExecutionResult) => (
        <ExecutionStatusIndicator
          status={UNIFIED_TO_RULE_STATUS[record.outcome.status]}
          showTooltip={true}
        />
      ),
      width: '10%',
    },
    {
      field: 'backfill',
      name: i18n.COLUMN_RUN_TYPE,
      render: (_value: unknown, record: UnifiedExecutionResult) => {
        const typeStr = record.backfill
          ? RULE_EXECUTION_TYPE_BACKFILL
          : RULE_EXECUTION_TYPE_STANDARD;
        return <EuiText size="s">{typeStr}</EuiText>;
      },
      width: '10%',
    },
    {
      field: 'execution_start',
      name: i18n.COLUMN_TIMESTAMP,
      render: (value: string) => <FormattedDate value={value} fieldName="execution_start" />,
      width: '15%',
    },
    {
      field: 'execution_duration_ms',
      name: i18n.COLUMN_DURATION,
      render: (value: number) => <RuleDurationFormat duration={value} />,
      width: '10%',
    },
    {
      field: 'metrics.alert_counts.new',
      name: i18n.COLUMN_ALERTS_CREATED,
      render: (_value: unknown, record: UnifiedExecutionResult) =>
        record.metrics.alert_counts?.new ?? 0,
      width: '10%',
    },
    {
      field: 'outcome.message',
      name: i18n.COLUMN_MESSAGE,
      render: (_value: unknown, record: UnifiedExecutionResult) => record.outcome.message ?? '—',
      width: '35%',
    },
    {
      name: i18n.COLUMN_ACTIONS,
      actions: [
        {
          name: i18n.ACTION_FILTER_BY_EXECUTION_ID,
          description: i18n.ACTION_FILTER_BY_EXECUTION_ID,
          icon: 'filter',
          type: 'icon',
          onClick: (_item: UnifiedExecutionResult) => {
            // Placeholder for filter action
          },
        },
        {
          name: i18n.ACTION_VIEW_DETAILS,
          description: i18n.ACTION_VIEW_DETAILS,
          icon: 'maximize',
          type: 'icon',
          onClick: (item: UnifiedExecutionResult) => {
            setSelectedItem(item);
          },
        },
      ],
      width: '10%',
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: mockResponse.total,
    pageSizeOptions: [5, 10, 25],
  };

  const onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const items = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    return mockResponse.executions.slice(startIndex, startIndex + pageSize);
  }, [pageIndex, pageSize]);

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={logTableI18n.TABLE_TITLE} subtitle={logTableI18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExecutionLogSearchBar
            onlyShowFilters={true}
            selectedStatuses={statusFilters}
            onStatusFilterChange={setStatusFilters}
            onSearch={onSearchCallback}
            selectedRunTypes={runTypeFilters}
            onRunTypeFilterChange={setRunTypeFilters}
          />
        </EuiFlexItem>
        <EuiFlexItem css={datePickerFlexItemCss}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onTimeChangeCallback}
            onRefresh={onRefreshCallback}
            isPaused={isPaused}
            isLoading={false}
            refreshInterval={refreshInterval}
            onRefreshChange={onRefreshChangeCallback}
            recentlyUsedRanges={[]}
            width="full"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiBasicTable
        tableCaption="Execution results"
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
      />
      {selectedItem && (
        <ExecutionDetailsFlyout item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
};
