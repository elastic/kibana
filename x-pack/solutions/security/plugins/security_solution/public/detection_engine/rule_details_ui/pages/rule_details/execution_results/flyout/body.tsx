/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { MessageSection } from './message_section';
import { BackfillSection } from './backfill_section';
import { AlertsSection } from './alerts_section';
import { IndicesSection } from './indices_section';
import { ExecutionMetricsSection } from './execution_metrics_section';
import { DurationBreakdownSection } from './duration_breakdown_section';

const flyoutBodyCss = css`
  .euiFlyoutBody__overflowContent {
    padding-top: 0;
  }
`;

interface FlyoutBodyProps {
  item: UnifiedExecutionResult;
}

export const FlyoutBody: React.FC<FlyoutBodyProps> = ({ item }) => {
  const alertCount = item.metrics.alert_counts?.new ?? null;
  const candidateCount = item.metrics.alerts_candidate_count;
  const gapSeconds = item.metrics.execution_gap_duration_s;

  return (
    <EuiFlyoutBody css={flyoutBodyCss}>
      <EuiSpacer size="m" />
      {item.outcome.message && (
        <>
          <MessageSection message={item.outcome.message} />
          <EuiSpacer size="m" />
        </>
      )}

      {item.backfill && (
        <>
          <BackfillSection backfill={item.backfill} />
          <EuiSpacer size="m" />
        </>
      )}

      <AlertsSection alertCount={alertCount} candidateCount={candidateCount} />
      <EuiSpacer size="m" />

      {(item.metrics.matched_indices_count !== null ||
        item.metrics.frozen_indices_queried_count !== null) && (
        <>
          <IndicesSection
            matchedIndicesCount={item.metrics.matched_indices_count}
            frozenIndicesQueriedCount={item.metrics.frozen_indices_queried_count}
          />
          <EuiSpacer size="m" />
        </>
      )}

      <ExecutionMetricsSection
        gapSeconds={gapSeconds}
        scheduleDelayMs={item.schedule_delay_ms}
        executionDurationMs={item.execution_duration_ms}
      />

      <EuiSpacer size="m" />
      <DurationBreakdownSection
        totalSearchDurationMs={item.metrics.total_search_duration_ms}
        totalIndexingDurationMs={item.metrics.total_indexing_duration_ms}
      />
    </EuiFlyoutBody>
  );
};
