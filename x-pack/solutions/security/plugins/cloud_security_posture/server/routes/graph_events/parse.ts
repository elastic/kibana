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
 * Note: totalRecords is added by the caller (v1.ts) after server-side pagination.
 */
export const parseEventRecords = (
  logger: Logger,
  records: EventRecord[]
): Omit<EventsResponse, 'totalRecords'> => {
  const events: EventOrAlertItem[] = records.map((record) => {
    const docId = record.docId;
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

    // Use entity names from entity store enrichment, falling back to ID if not available
    const actorName = record.actorEntityName ?? actorId ?? undefined;
    const targetName = record.targetEntityName ?? targetId ?? undefined;

    return {
      id: docId,
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
    };
  });

  logger.trace(`Parsed ${events.length} events`);

  return { events };
};
