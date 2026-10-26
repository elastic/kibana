/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { hasEvidence } from './cohort';

export const EVIDENCE_PROVENANCE = 'derived-from-raw-events';

interface RawEvent extends Record<string, unknown> {
  '@timestamp': string;
  host: { name: string; id?: string; [key: string]: unknown };
  user: { name: string; [key: string]: unknown };
}

/** Correlation ids are fixture bookkeeping, not independent asset evidence. */
export const buildEvidence = (payload: Record<string, unknown>, attackId: string) => {
  if (!hasEvidence(payload)) {
    return { events: [], entities: [], identities: [] };
  }
  const observed = (payload.events as unknown[]).map((value, i): RawEvent => {
    const event = value as RawEvent | null;
    if (
      !event ||
      typeof event['@timestamp'] !== 'string' ||
      !Number.isFinite(Date.parse(event['@timestamp'])) ||
      typeof event.host?.name !== 'string' ||
      !event.host.name.trim() ||
      typeof event.user?.name !== 'string' ||
      !event.user.name.trim()
    ) {
      throw new Error(`Raw event ${i} requires a valid timestamp and observed host.name/user.name`);
    }
    return event;
  });
  const anchor = Date.parse(observed[0]['@timestamp']);
  if (
    observed.some((event) => Math.abs(Date.parse(event['@timestamp']) - anchor) > 2 * 60 * 60_000)
  ) {
    throw new Error('Raw events fall outside the discovery ±2h window');
  }
  const identities = Array.from(
    new Map(
      observed.map((event) => {
        const hostId = `fixture-${createHash('sha256')
          .update(JSON.stringify([attackId, event.host.name]))
          .digest('hex')}`;
        return [
          JSON.stringify([event.host.name, event.user.name]),
          { host: { id: hostId, name: event.host.name }, user: { name: event.user.name } },
        ];
      })
    ).values()
  );
  const hostIdByName = new Map(identities.map((id) => [id.host.name, id.host.id]));
  const events = observed.map((event) => ({
    ...event,
    host: { ...event.host, id: hostIdByName.get(event.host.name) },
    labels: {
      ...(event.labels as Record<string, unknown> | undefined),
      fp_tp_fixture: attackId,
    },
  }));
  // Host entities are per attack discovery (host.id is). User entities are keyed
  // by user name alone, since `user.name` is shared across cases and the workflow
  // matches entities on it: one identity-only doc per user, never one per case.
  const entities = identities.flatMap((identity) =>
    (['host', 'user'] as const).map((type) => ({
      '@timestamp': observed[0]['@timestamp'],
      entity: {
        id:
          type === 'host'
            ? `fixture-host-${identity.host.id}`
            : `fixture-user-${createHash('sha256').update(identity.user.name).digest('hex')}`,
        name: identity[type].name,
        type,
      },
      [type]: identity[type],
      labels: { provenance: EVIDENCE_PROVENANCE, fp_tp_fixture: attackId },
    }))
  );
  return { events, entities, identities };
};
