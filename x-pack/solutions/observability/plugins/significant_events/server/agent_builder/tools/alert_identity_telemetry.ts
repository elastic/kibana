/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type { AlertIdentityProps } from '../../lib/telemetry/ebt';

/** Reported in place of an id or space the tool could not resolve before it failed. */
export const UNKNOWN_TELEMETRY_VALUE = 'unknown';

/**
 * The alert identity fields of an agent-tool event about one Significant Event. The tools only
 * ever write `elastic.significant_events` alerts, whose `fingerprint` is the `event_id`.
 */
export const alertIdentity = (
  eventId: string | undefined,
  spaceId: string
): AlertIdentityProps => ({
  alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
  fingerprint: eventId ?? UNKNOWN_TELEMETRY_VALUE,
  space_id: spaceId,
});
