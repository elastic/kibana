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
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import type { EventRecord } from './types';
import { transformEntityTypeToIconAndShape } from '../graph/utils';

/**
 * Normalizes a value to an array of strings.
 */
const normalizeToArray = (value?: string | string[] | null): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  return Array.isArray(value) ? value : [value];
};

/**
 * Parses event records into EventOrAlertItem response.
 * Note: totalRecords is added by the caller (v1.ts) after server-side pagination.
 */
export const parseEventRecords = (
  logger: Logger,
  records: EventRecord[],
  nodesLimit?: number
): Omit<EventsResponse, 'totalRecords'> => {
  const messages: ApiMessageCode[] = [];

  if (nodesLimit !== undefined && records.length >= nodesLimit) {
    messages.push(ApiMessageCode.ReachedNodesLimit);
  }

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

    return {
      id: docId,
      isAlert,
      docId,
      index: index ?? undefined,
      timestamp: timestamp ?? undefined,
      action: action ?? undefined,
      actor: actorId
        ? {
            id: actorId,
            label: actorId,
            ...(actorIcon ? { icon: actorIcon } : {}),
          }
        : undefined,
      target: targetId
        ? {
            id: targetId,
            label: targetId,
            ...(targetIcon ? { icon: targetIcon } : {}),
          }
        : undefined,
      ips: normalizeToArray(record.sourceIps),
      countryCodes: normalizeToArray(record.sourceCountryCodes),
    };
  });

  logger.trace(`Parsed ${events.length} events`);

  return {
    events,
    messages: messages.length > 0 ? messages : undefined,
  };
};
