/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  EventOrAlertItem,
  EventsResponse,
} from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import type { EventRecord } from './types';
import { transformEntityTypeToIconAndShape, normalizeToArray } from '../graph/utils';

/**
 * Parses event records into EventOrAlertItem response.
 * Only returns records that were found for the requested document IDs.
 * Note: totalRecords is added by the caller (v1.ts) after server-side pagination.
 */
export const parseEventRecords = (
  logger: Logger,
  records: EventRecord[],
  requestedEventIds: string[]
): Omit<EventsResponse, 'totalRecords'> => {
  const foundEventsMap = new Map<string, EventRecord>();
  records.forEach((record) => {
    foundEventsMap.set(record.docId, record);
  });

  const events: EventOrAlertItem[] = requestedEventIds.flatMap((eventId) => {
    const record = foundEventsMap.get(eventId);

    if (!record) {
      logger.debug(`Event ID ${eventId} not found in events or alerts`);

      return [];
    }

    const index = record.index;
    const timestamp = record.timestamp;
    const action = record.action;
    const isAlert = record.isAlert ?? false;
    const actorId = record.actorEntityId;
    const actorParentField = record.actorEcsParentField;
    const targetId = record.targetEntityId;
    const targetParentField = record.targetEcsParentField;

    const { icon: actorIcon } = transformEntityTypeToIconAndShape(actorParentField ?? '');
    const { icon: targetIcon } = transformEntityTypeToIconAndShape(targetParentField ?? '');

    const actorName = record.actorEntityName ?? actorId ?? undefined;
    const targetName = record.targetEntityName ?? targetId ?? undefined;

    return [
      {
        id: eventId,
        isAlert,
        index: index ?? undefined,
        timestamp: timestamp ?? undefined,
        action: action ?? undefined,
        actor: actorId
          ? {
              id: actorId,
              name: actorName,
              ...(actorIcon ? { icon: actorIcon } : {}),
            }
          : undefined,
        target: targetId
          ? {
              id: targetId,
              name: targetName,
              ...(targetIcon ? { icon: targetIcon } : {}),
            }
          : undefined,
        ips: normalizeToArray(record.sourceIps),
        countryCodes: normalizeToArray(record.sourceCountryCodes),
      },
    ];
  });

  logger.trace(
    `Parsed ${events.length} events (${records.length} found, ${
      requestedEventIds.length - events.length
    } missing)`
  );

  return { events };
};
