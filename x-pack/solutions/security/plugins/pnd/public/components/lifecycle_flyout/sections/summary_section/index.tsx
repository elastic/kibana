/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { usePndExecution } from '../../../../hooks/use_pnd_execution';
import { PndCorrelationUnavailableState, PndQueryState } from '../../../../states';
import { buildLifecycleRows } from '../../../lifecycle_view';
import { PhaseStepStatusBadge } from '../../../phase_step_status_badge';
import { resolveCorrelationUnavailable } from '../../helpers/resolve_correlation_unavailable';
import { summarizeLifecycle } from '../../helpers/summarize_lifecycle';
import * as i18n from '../../translations';
import { LifecycleParticipants } from './participants';

export interface LifecycleSummarySectionProps {
  correlationId: string;
}

/**
 * Where one discovery is in the loop, in four lines: the Overview tab's fields table.
 *
 * It reads the **same** projection as the Lifecycle section below it — one react-query entry, one
 * cache key — and derives everything from the same rows, so the summary that answers "where is
 * this?" can never disagree with the rows that answer "what happened?". Nothing here is a second
 * read, and nothing here is a fact the catalog rows do not already contain; the value is that an
 * analyst does not have to scan them to find the one gate that is waiting on a decision.
 *
 * A **section** rather than a tab since decision 1 of the 2026-08-17 sync: it is the first thing the
 * Overview tab renders, and `tabs/overview_tab` composes it with the three sections that follow.
 */
export const LifecycleSummarySection: React.FC<LifecycleSummarySectionProps> = ({
  correlationId,
}) => {
  const { data, error, isLoading, refetch } = usePndExecution(correlationId);

  const steps = useMemo(() => data?.execution.steps ?? [], [data]);
  const rows = useMemo(() => buildLifecycleRows({ steps }), [steps]);
  const summary = useMemo(() => summarizeLifecycle(rows), [rows]);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const currentStep = summary.currentStep;

  const listItems = useMemo(
    () => [
      {
        description: <span data-test-subj="pndLifecycleOverviewAlertId">{correlationId}</span>,
        title: i18n.OVERVIEW_ALERT_ID_LABEL,
      },
      {
        description: (
          <span data-test-subj="pndLifecycleOverviewProgress">
            {i18n.overviewProgress(summary.passedLiveSteps, summary.totalLiveSteps)}
          </span>
        ),
        title: i18n.OVERVIEW_PROGRESS_LABEL,
      },
      {
        description: (
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="pndLifecycleOverviewCurrentStep"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              {currentStep != null ? currentStep.entry.label : i18n.OVERVIEW_NOTHING_WAITING}
            </EuiFlexItem>
            {currentStep != null ? (
              <EuiFlexItem grow={false}>
                <PhaseStepStatusBadge status={currentStep.status} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
        title: i18n.OVERVIEW_CURRENT_STEP_LABEL,
      },
      {
        description: (
          <span data-test-subj="pndLifecycleOverviewRuns">{summary.workflowRunIds.join(', ')}</span>
        ),
        title: i18n.OVERVIEW_RUNS_LABEL,
      },
    ],
    [correlationId, currentStep, summary]
  );

  return (
    <div data-test-subj="pndLifecycleSection-summary">
      <PndQueryState
        emptyBody={i18n.OVERVIEW_EMPTY_BODY}
        emptyTitle={i18n.OVERVIEW_EMPTY_TITLE}
        error={error}
        // "we could not correlate a run" is a different claim from "there is nothing here", and it
        // is rendered as its own state below rather than as the generic empty prompt.
        isEmpty={!isLoading && error == null && rows.length === 0}
        isLoading={isLoading}
        onRetry={onRetry}
      >
        {resolveCorrelationUnavailable(data) ? (
          <PndCorrelationUnavailableState onRetry={onRetry} />
        ) : (
          <>
            <EuiDescriptionList compressed listItems={listItems} type="column" />

            <EuiSpacer size="m" />

            <EuiTitle size="xxs">
              <h3>{i18n.OVERVIEW_STATUS_BREAKDOWN_LABEL}</h3>
            </EuiTitle>

            <EuiSpacer size="xs" />

            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {summary.statusCounts.map(({ count, status }) => (
                <EuiFlexItem grow={false} key={status}>
                  <EuiFlexGroup
                    alignItems="center"
                    aria-label={i18n.statusCountAriaLabel(count, status)}
                    data-status={status}
                    data-test-subj={`pndLifecycleOverviewStatusCount-${status}`}
                    gutterSize="xs"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <PhaseStepStatusBadge status={status} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">{count}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <LifecycleParticipants steps={steps} />
          </>
        )}
      </PndQueryState>
    </div>
  );
};
