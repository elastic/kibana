/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationOutput, useInvestigationState } from '@kbn/investigation-output';
import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';
import { formatTimestamp } from '../format_timestamp';

export interface EventInvestigationsProps {
  event: SignificantEvent;
}

// A slow tick is enough because `humanize()` output is coarse ("2 minutes").
const RUNNING_DURATION_TICK_MS = 30_000;

// The workflow stamps `completed_at` on the significant-event doc when it finishes.
const isInvestigationRunning = (investigation: SignificantEventInvestigation): boolean =>
  investigation.completed_at == null;

const getRunningDurationText = (duration: string): string =>
  i18n.translate('xpack.observability.nightshift.flyout.investigationRunningDuration', {
    defaultMessage: '{duration} (running)',
    values: { duration },
  });

const formatDuration = (startedAt: string, endedAt: number | string): string => {
  const start = new Date(startedAt).getTime();
  const end = typeof endedAt === 'string' ? new Date(endedAt).getTime() : endedAt;
  return moment.duration(Math.max(0, end - start)).humanize();
};

const useNow = (enabled: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const intervalId = setInterval(() => setNow(Date.now()), RUNNING_DURATION_TICK_MS);
    return () => clearInterval(intervalId);
  }, [enabled]);

  return now;
};

function InvestigationRow({
  investigation,
  initialIsOpen,
}: {
  investigation: SignificantEventInvestigation;
  initialIsOpen: boolean;
}): React.ReactElement {
  const { http } = useKibana().services;
  const {
    started_at: startedAt,
    completed_at: completedAt,
    workflow_execution_id: workflowExecutionId,
  } = investigation;
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftEventInvestigation' });

  // The hook's `status` is authoritative over the doc-derived flag: it settles as
  // soon as the live stream ends, which can be before `completed_at` reaches the doc.
  const { state, error, status } = useInvestigationState({
    http,
    workflowExecutionId,
    isRunning: isInvestigationRunning(investigation),
  });

  const isRunning = status === 'running';
  const now = useNow(isRunning);
  // Falling back to "now" keeps a duration on runs that settled before
  // `completed_at` reached the doc.
  const duration = formatDuration(startedAt, completedAt ?? now);
  const durationSuffix = isRunning ? getRunningDurationText(duration) : duration;

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen={initialIsOpen}
      data-test-subj="nightshiftEventInvestigationRow"
      buttonContent={
        <EuiText size="xs" color="subdued">
          {formatTimestamp(startedAt)}
          {` · ${durationSuffix}`}
        </EuiText>
      }
    >
      <EuiSpacer size="s" />
      <InvestigationOutput status={status} state={state} error={error} />
    </EuiAccordion>
  );
}

export function EventInvestigations({ event }: EventInvestigationsProps): React.ReactElement {
  const investigations = event.investigations ?? [];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.observability.nightshift.flyout.investigationsTitle', {
              defaultMessage: 'Investigations',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {investigations.length === 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.observability.nightshift.flyout.investigationsEmptyDescription',
                { defaultMessage: 'No investigations yet.' }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      ) : (
        investigations.map((investigation, index) => {
          // Investigations are appended to the event doc in run order.
          const isMostRecent = index === investigations.length - 1;
          return (
            <EuiFlexItem key={investigation.workflow_execution_id} grow={false}>
              <InvestigationRow investigation={investigation} initialIsOpen={isMostRecent} />
            </EuiFlexItem>
          );
        })
      )}
    </EuiFlexGroup>
  );
}
