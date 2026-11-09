/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type {
  AlertCreationAttemptIdentityProps,
  ExistingAlertIdentityProps,
} from '../../lib/telemetry/ebt';
import type { EventsWriteBulkResult } from './event_write/types';

/** Identity of the Significant Event addressed; `event_id` is its fingerprint even on failure. */
export const existingAlertIdentity = ({
  eventId,
  spaceId,
}: {
  eventId: string;
  spaceId: string;
}): ExistingAlertIdentityProps => ({
  alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
  fingerprint: eventId,
  space_id: spaceId,
});

export const alertCreationAttemptIdentity = ({
  spaceId,
  eventId,
  groupHash,
}: {
  spaceId: string;
  eventId?: string;
  groupHash?: string;
}): AlertCreationAttemptIdentityProps => ({
  alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
  space_id: spaceId,
  ...(eventId !== undefined ? { fingerprint: eventId } : {}),
  ...(groupHash !== undefined ? { group_hash: groupHash } : {}),
});

/** The stored or caller-named event an `events_write` item addressed; never an unpersisted generated id. */
export const eventsWriteResultEventId = (
  result: EventsWriteBulkResult,
  callerEventId: string | undefined
): string | undefined => {
  if (result.written) {
    return result.event_id;
  }
  if ('skipped' in result) {
    if (result.reason !== 'unchanged_outcome') {
      return result.existing_event_id;
    }
    // An unchanged outcome carries `status` only when the event is stored.
    return result.status === undefined ? callerEventId : result.event_id;
  }
  return result.reason === 'superseded'
    ? result.event_id
    : result.existing_event_id ?? callerEventId;
};
