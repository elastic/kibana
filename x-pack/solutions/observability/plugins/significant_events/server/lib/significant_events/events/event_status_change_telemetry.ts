/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEvent,
  type SignificantEventCloseReason,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ENTITY_TYPE } from '../../telemetry/ebt/constants';
import type { EventStatusChangedProps, SignificantEventActor } from '../../telemetry/ebt';
import type { StatusChange } from './lifecycle/lifecycle_controller';

export interface EventStatusChangeReporter {
  trackEventStatusChanged: (params: EventStatusChangedProps) => void;
}

/** Who writes a version and, when the lifecycle decided its status, the change they submitted. */
export interface WriteOrigin {
  actor: SignificantEventActor;
  change?: StatusChange;
  closeReason?: SignificantEventCloseReason;
}

/** The status-change record for a written version; undefined when the status did not change. */
export const buildEventStatusChangedProps = ({
  event,
  prior,
  origin,
  spaceId,
}: {
  event: SignificantEvent;
  prior: Pick<SignificantEvent, 'status'> | undefined;
  origin: WriteOrigin;
  spaceId: string;
}): EventStatusChangedProps | undefined => {
  if (prior !== undefined && prior.status === event.status) {
    return undefined;
  }
  const signals = event.signals ?? [];
  const { actor, change, closeReason } = origin;
  const closedByOperator =
    change?.kind === 'operator' && event.status === ALERT_EPISODE_STATUS.INACTIVE;
  return {
    alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
    fingerprint: event.event_id,
    space_id: spaceId,
    entity_type: SIGNIFICANT_EVENT_ENTITY_TYPE,
    ...(prior !== undefined ? { previous_status: prior.status } : {}),
    status: event.status,
    actor,
    ...(change !== undefined ? { change_kind: change.kind } : {}),
    ...(change?.kind === 'assessment' ? { assessment_outcome: change.outcome } : {}),
    ...(closedByOperator && closeReason !== undefined ? { close_reason: closeReason } : {}),
    severity: event.severity,
    confidence: event.confidence,
    signal_count: signals.length,
    confirmed_signal_count: signals.filter(({ verdict }) => verdict === 'confirms').length,
    source_ids: event.source_ids,
    ...(event.workflow_execution_id !== undefined
      ? { workflow_execution_id: event.workflow_execution_id }
      : {}),
  };
};

/** Reports a status transition; a telemetry failure never fails the write. */
export const reportEventStatusChange = ({
  telemetry,
  logger,
  ...change
}: {
  telemetry: EventStatusChangeReporter | undefined;
  logger?: Logger;
  event: SignificantEvent;
  prior: Pick<SignificantEvent, 'status'> | undefined;
  origin: WriteOrigin;
  spaceId: string;
}): void => {
  if (!telemetry) return;
  const props = buildEventStatusChangedProps(change);
  if (!props) return;
  try {
    telemetry.trackEventStatusChanged(props);
  } catch (error) {
    logger?.warn(
      `Failed to track event status change: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
