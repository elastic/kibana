/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiText, EuiTextBlockTruncate } from '@elastic/eui';
import * as i18n from './translations';
import { ExecutionStatusIndicator } from '../../../../rule_monitoring';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { RuleDurationFormat } from '../execution_log_table/rule_duration_format';
import { TableHeaderTooltipCell } from '../../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../common/translations';
import type {
  RuleExecutionStatus,
  UnifiedExecutionResult,
  UnifiedExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

export const UNIFIED_TO_RULE_STATUS: Record<UnifiedExecutionStatus, RuleExecutionStatus> = {
  success: 'succeeded',
  warning: 'partial failure',
  failure: 'failed',
};

interface GetColumnsArgs {
  onFilterByExecutionId: (executionId: string, executionStart: string) => void;
  onViewDetails: (item: UnifiedExecutionResult) => void;
}

export const getColumns = ({
  onFilterByExecutionId,
  onViewDetails,
}: GetColumnsArgs): Array<EuiBasicTableColumn<UnifiedExecutionResult>> => [
  {
    field: 'outcome.status',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_STATUS}
        tooltipContent={i18n.COLUMN_STATUS_TOOLTIP}
      />
    ),
    render: (_: unknown, record: UnifiedExecutionResult) => (
      <span data-test-subj="executionResultsTableCellStatus">
        <ExecutionStatusIndicator
          status={UNIFIED_TO_RULE_STATUS[record.outcome.status]}
          showTooltip={true}
        />
      </span>
    ),
    textOnly: false,
    width: '120px',
  },
  {
    field: 'backfill',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_RUN_TYPE}
        tooltipContent={i18n.COLUMN_RUN_TYPE_TOOLTIP}
      />
    ),
    render: (_: unknown, record: UnifiedExecutionResult) => {
      const typeStr = record.backfill ? RULE_EXECUTION_TYPE_BACKFILL : RULE_EXECUTION_TYPE_STANDARD;
      return (
        <EuiText size="s" data-test-subj="executionResultsTableCellRunType">
          {typeStr}
        </EuiText>
      );
    },
    width: '110px',
  },
  {
    field: 'execution_start',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_TIMESTAMP}
        tooltipContent={i18n.COLUMN_TIMESTAMP_TOOLTIP}
      />
    ),
    render: (value: string) => (
      <span data-test-subj="executionResultsTableCellTimestamp">
        <FormattedDate value={value} fieldName="execution_start" />
      </span>
    ),
    sortable: true,
    width: '240px',
  },
  {
    field: 'execution_duration_ms',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_DURATION}
        tooltipContent={i18n.COLUMN_DURATION_TOOLTIP}
      />
    ),
    render: (value: number | null) => (
      <span data-test-subj="executionResultsTableCellDuration">
        {value != null ? <RuleDurationFormat duration={value} /> : '—'}
      </span>
    ),
    sortable: true,
    width: '170px',
  },
  {
    field: 'metrics.alert_counts.new',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_ALERTS_CREATED}
        tooltipContent={i18n.COLUMN_ALERTS_CREATED_TOOLTIP}
      />
    ),
    render: (_: unknown, record: UnifiedExecutionResult) => (
      <span data-test-subj="executionResultsTableCellAlerts">
        {record.metrics.alert_counts?.new ?? 0}
      </span>
    ),
    width: '130px',
  },
  {
    field: 'outcome.message',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_MESSAGE}
        tooltipContent={i18n.COLUMN_MESSAGE_TOOLTIP}
      />
    ),
    render: (_: unknown, record: UnifiedExecutionResult) => (
      <span data-test-subj="executionResultsTableCellMessage">
        <EuiTextBlockTruncate lines={2}>{record.outcome.message ?? '—'}</EuiTextBlockTruncate>
      </span>
    ),
  },
  {
    name: i18n.COLUMN_ACTIONS,
    actions: [
      {
        name: i18n.ACTION_FILTER_BY_EXECUTION_ID,
        description: (item: UnifiedExecutionResult) =>
          (item.metrics.alert_counts?.new ?? 0) > 0
            ? i18n.ACTION_FILTER_BY_EXECUTION_ID
            : i18n.ACTION_FILTER_BY_EXECUTION_ID_DISABLED,
        icon: 'filter',
        type: 'icon',
        enabled: (item: UnifiedExecutionResult) => (item.metrics.alert_counts?.new ?? 0) > 0,
        onClick: (item: UnifiedExecutionResult) => {
          if (item.execution_uuid) {
            onFilterByExecutionId(item.execution_uuid, item.execution_start);
          }
        },
      },
      {
        name: i18n.ACTION_VIEW_DETAILS,
        description: i18n.ACTION_VIEW_DETAILS,
        icon: 'maximize',
        type: 'icon',
        onClick: onViewDetails,
        'data-test-subj': 'executionResultsTableActionViewDetails',
      },
    ],
    width: '80px',
  },
];
