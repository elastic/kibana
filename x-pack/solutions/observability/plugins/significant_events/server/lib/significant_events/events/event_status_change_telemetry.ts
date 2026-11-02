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

/** The one telemetry method the write path needs; a test can pass a plain mock. */
export type EventStatusChangeReporter = Pick<EbtTelemetryClient, 'trackEventStatusChanged'>;

/**
 * The status-change record for a written version, or undefined when the version keeps the status
 * stored before it (a continuation that only merged signals or moved severity is not a transition).
 */
export const buildEventStatusChangedProps = ({
  event,
  prior,
  actor,
  spaceId,
}: {
  event: SignificantEvent;
  prior: Pick<SignificantEvent, 'status'> | undefined;
  actor: SignificantEventActor;
  spaceId: string;
}): EventStatusChangedProps | undefined => {
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

/** Reports a status transition best-effort: telemetry never changes the outcome of the write. */
export const reportEventStatusChange = ({
  telemetry,
  logger,
  ...change
}: {
  telemetry: EventStatusChangeReporter | undefined;
  logger?: Logger;
  event: SignificantEvent;
  prior: Pick<SignificantEvent, 'status'> | undefined;
  actor: SignificantEventActor;
  spaceId: string;
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
