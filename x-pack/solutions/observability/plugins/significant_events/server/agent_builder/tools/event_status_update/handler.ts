/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import type { EventClient } from '../../../lib/significant_events/events';

export async function updateEventStatusToolHandler({
  eventClient,
  eventUuid,
  status,
  alertEventsClient,
  logger,
}: {
  eventClient: EventClient;
  eventUuid: string;
  status: SignificantEventStatus;
  alertEventsClient?: AlertEventsClientApi;
  logger: Logger;
}): Promise<{
  event_uuid?: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> {
  // This tool's public contract is still keyed on event_uuid (agent-builder tools are out of
  // scope for github.com/elastic/nightshift-program/issues/1646 — see #1492's phase-3 rename
  // note). Resolve the version's event_id here — findByEventUuid is an exact match on a unique
  // field, so it returns at most one hit. On a miss, resolvedEventId falls back to the raw
  // eventUuid (not a real event_id) — the eventId-keyed findByEventId inside
  // updateSignificantEventStatus will also find nothing and report `ignored: 1`, so the tool
  // still degrades safely on a genuine miss.
  const resolvedEventId =
    (await eventClient.findByEventUuid(eventUuid)).hits[0]?.event_id ?? eventUuid;

  return updateSignificantEventStatus({
    eventClient,
    eventId: resolvedEventId,
    status,
    alertEventsClient,
    logger,
  });
}
