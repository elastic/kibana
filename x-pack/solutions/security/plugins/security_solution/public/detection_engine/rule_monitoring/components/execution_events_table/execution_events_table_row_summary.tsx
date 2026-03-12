/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type {
  RuleExecutionEvent,
  RuleExecutionMetrics,
  RuleExecutionStatus,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import { RuleExecutionEventTypeEnum } from '../../../../../common/api/detection_engine/rule_monitoring';

import { assertUnreachable } from '../../../../../common/utility_types';
import { TruncatedText } from '../basic/text/truncated_text';
import { RuleStatusBadge } from '../../../common/components/rule_execution_status/rule_status_badge';

import * as i18n from './translations';

interface ExecutionEventsTableSummaryCellProps {
  event: RuleExecutionEvent;
}

export function ExecutionEventsTableSummaryCell({ event }: ExecutionEventsTableSummaryCellProps) {
  switch (event.type) {
    case RuleExecutionEventTypeEnum.message:
      return <MessageSummary message={event.message} />;
    case RuleExecutionEventTypeEnum['status-change']:
      return <StatusChangeSummary details={event.details} />;
    case RuleExecutionEventTypeEnum['execution-metrics']:
      return <ExecutionMetricsSummary details={event.details} />;
    default:
      assertUnreachable(event.type, 'Unknown rule execution event type');
  }
}

function MessageSummary({ message }: { message: string }) {
  const firstLineOnly = message.split('\n')[0];
  return <TruncatedText text={firstLineOnly} />;
}

interface StatusChangeSummaryProps {
  details?: { status?: RuleExecutionStatus };
}

function StatusChangeSummary({ details }: StatusChangeSummaryProps) {
  const status = details?.status;

  if (!status) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem grow={false}>{i18n.STATUS_CHANGED_TO}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RuleStatusBadge status={status} showTooltip={false} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface ExecutionMetricsSummaryProps {
  details?: { metrics?: RuleExecutionMetrics };
}

function ExecutionMetricsSummary({ details }: ExecutionMetricsSummaryProps) {
  const metrics = details?.metrics;

  const summaryMetrics: string[] = [];

  if (metrics?.execution_gap_duration_s) {
    summaryMetrics.push(i18n.GAP_DURATION(metrics.execution_gap_duration_s));
  }

  summaryMetrics.push(i18n.SEARCH_DURATION(metrics?.total_search_duration_ms ?? 0));

  if (metrics?.total_indexing_duration_ms) {
    summaryMetrics.push(i18n.INDEXING_DURATION(metrics.total_indexing_duration_ms));
  }

  return <TruncatedText text={summaryMetrics.join(', ')} />;
}
