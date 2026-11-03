/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEvent,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ENTITY_TYPE } from '../../telemetry/ebt/constants';
import type {
  EbtTelemetryClient,
  EventStatusChangedProps,
  SignificantEventActor,
} from '../../telemetry/ebt';
import type { StatusChangeCause } from './lifecycle/lifecycle_controller';

export type EventStatusChangeReporter = Pick<EbtTelemetryClient, 'trackEventStatusChanged'>;

interface EventStatusChange {
  event: SignificantEvent;
  prior: Pick<SignificantEvent, 'status'> | undefined;
  actor: SignificantEventActor;
  change: StatusChangeCause;
  spaceId: string;
}

/** The status-change record for a written version; undefined when the status did not change. */
export const buildEventStatusChangedProps = ({
  event,
  prior,
  actor,
  change,
  spaceId,
}: EventStatusChange): EventStatusChangedProps | undefined => {
  if (prior !== undefined && prior.status === event.status) {
    return undefined;
  }
  const signals = event.signals ?? [];
  return {
    alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
    fingerprint: event.event_id,
    space_id: spaceId,
    entity_type: SIGNIFICANT_EVENT_ENTITY_TYPE,
    ...(prior !== undefined ? { previous_status: prior.status } : {}),
    status: event.status,
    actor,
    change_kind: change.kind,
    ...(change.kind === 'assessment' ? { outcome: change.outcome } : {}),
    severity: event.severity,
    confidence: event.confidence,
    signal_count: signals.length,
    confirmed_signal_count: signals.filter(({ verdict }) => verdict === 'confirms').length,
    source_ids: event.source_ids,
    ...(event.workflow_execution_id !== undefined
      ? { execution_id: event.workflow_execution_id }
      : {}),
  };
};

/** Reports a status transition; a telemetry failure never fails the write. */
export const reportEventStatusChange = ({
  telemetry,
  logger,
  ...change
}: EventStatusChange & {
  telemetry: EventStatusChangeReporter | undefined;
  logger?: Logger;
}): void => {
  if (!telemetry) return;
  const props = buildEventStatusChangedProps(change);
  if (!props) return;
  try {
    telemetry.trackEventStatusChanged(props);
  } catch (error) {
    logger?.debug(
      `Failed to report event status change telemetry: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
