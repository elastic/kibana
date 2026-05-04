/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { MessageSection } from './sections/message';
import { BackfillSection } from './sections/backfill';
import { AlertsSection } from './sections/alerts';
import { IndicesSection } from './sections/indices';
import { TimingSection } from './sections/timing';
import { DurationBreakdownSection } from './sections/duration';

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
          <EuiHorizontalRule margin="m" />
        </>
      )}

      {item.backfill && (
        <>
          <BackfillSection backfill={item.backfill} />
          <EuiHorizontalRule margin="m" />
        </>
      )}

      <AlertsSection alertCount={alertCount} candidateCount={candidateCount} />
      <EuiHorizontalRule margin="m" />

      <IndicesSection
        matchedIndicesCount={item.metrics.matched_indices_count}
        frozenIndicesQueriedCount={item.metrics.frozen_indices_queried_count}
      />
      <EuiHorizontalRule margin="m" />

      <TimingSection
        gapSeconds={gapSeconds}
        scheduleDelayMs={item.schedule_delay_ms}
        executionDurationMs={item.execution_duration_ms}
      />
      <EuiHorizontalRule margin="m" />

      <DurationBreakdownSection
        totalSearchDurationMs={item.metrics.total_search_duration_ms}
        totalIndexingDurationMs={item.metrics.total_indexing_duration_ms}
      />
    </EuiFlyoutBody>
  );
};
