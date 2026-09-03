/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { usePndExecution } from '../../../../hooks/use_pnd_execution';
import { PndCorrelationUnavailableState, PndQueryState } from '../../../../states';
import { buildLifecycleRows, LifecycleStepLink } from '../../../lifecycle_view';
import { PhaseStepStatusBadge } from '../../../phase_step_status_badge';
import { buildLifecycleTimeline } from '../../helpers/build_lifecycle_timeline';
import type { LifecycleTimelineEntry } from '../../helpers/build_lifecycle_timeline';
import { resolveCorrelationUnavailable } from '../../helpers/resolve_correlation_unavailable';
import * as i18n from '../../translations';

interface TimelineEntryProps {
  entry: LifecycleTimelineEntry;
}

/**
 * One step execution, placed on the run's chronology.
 *
 * Timestamps are raw ISO strings inside `<time dateTime>`, matching the convention the rest of PND
 * uses: assertable without pinning a timezone in tests, and machine-readable for anything reading
 * the DOM.
 */
const TimelineEntry: React.FC<TimelineEntryProps> = ({
  entry: { entry, finishedAt, projection, startedAt, status },
}) => (
  <>
    <EuiPanel
      data-phase-step-id={entry.id}
      data-status={status}
      data-test-subj="pndLifecycleTimelineEntry"
      hasBorder
      hasShadow={false}
      paddingSize="s"
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{entry.label}</strong>
          </EuiText>
          <EuiText color="subdued" size="xs">
            {`${i18n.TIMELINE_STARTED}: `}
            <time dateTime={startedAt} data-test-subj="pndLifecycleTimelineStartedAt">
              {startedAt}
            </time>
          </EuiText>
          {finishedAt != null ? (
            <EuiText color="subdued" size="xs">
              {`${i18n.TIMELINE_FINISHED}: `}
              <time dateTime={finishedAt} data-test-subj="pndLifecycleTimelineFinishedAt">
                {finishedAt}
              </time>
            </EuiText>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <PhaseStepStatusBadge status={status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LifecycleStepLink
                ariaLabel={i18n.timelineStepAriaLabel(entry.label)}
                projection={projection}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
    <EuiSpacer size="xs" />
  </>
);

export interface LifecycleTimelineTabProps {
  correlationId: string;
}

/**
 * What the run actually did, in the order it did it.
 *
 * The one ordering the Lifecycle section cannot express. The catalog is a fixed document, so its rows
 * are always in document order; a timeline is the run's own order, which is the only way to see that
 * tuning was drafted *before* the gate it is now parked on, or that a phase-3 step ran ahead of a
 * phase-2 one.
 *
 * Only steps that recorded a start time appear — see `buildLifecycleTimeline` for why piling the
 * other 20-odd rows at one end would make this a worse copy of the Lifecycle section.
 */
export const LifecycleTimelineTab: React.FC<LifecycleTimelineTabProps> = ({ correlationId }) => {
  const { data, error, isLoading, refetch } = usePndExecution(correlationId);

  const entries = useMemo(
    () => buildLifecycleTimeline(buildLifecycleRows({ steps: data?.execution.steps ?? [] })),
    [data]
  );

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const correlationUnavailable = resolveCorrelationUnavailable(data);

  return (
    <div data-test-subj="pndLifecyclePanel-timeline">
      <PndQueryState
        emptyBody={i18n.TIMELINE_EMPTY_BODY}
        emptyTitle={i18n.TIMELINE_EMPTY_TITLE}
        error={error}
        // A correlated run with nothing timestamped yet is genuinely empty, and reads as normal.
        // A run that could not be correlated is a different claim, and keeps its own state below.
        isEmpty={!isLoading && error == null && !correlationUnavailable && entries.length === 0}
        isLoading={isLoading}
        onRetry={onRetry}
      >
        {correlationUnavailable ? (
          <PndCorrelationUnavailableState onRetry={onRetry} />
        ) : (
          entries.map((entry) => <TimelineEntry entry={entry} key={entry.entry.id} />)
        )}
      </PndQueryState>
    </div>
  );
};
