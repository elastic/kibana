/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { StateConflictError } from '../errors/state_conflict_error';
import type { StateStore } from './state_store';
import type { StateVersion } from './state_kinds';

/**
 * Meant to be longer than a run. The lease is never renewed, so the runner must finish within a
 * budget below this TTL, or a takeover can overlap a live run. Short enough that a crashed holder
 * blocks the space for one or two ticks only.
 */
export const DEFAULT_RUN_LEASE_TTL_MS = 6 * 60_000;

/** A lease this process holds. */
export interface HeldRunLease {
  owner: string;
  expires_at: string;
  /** Deletes the lease if it is still ours. Call it in a `finally`. */
  release(): Promise<void>;
}

/** Either the lease is ours, or the space is busy and the holder is named. */
export type RunLeaseAttempt =
  | { acquired: true; held: HeldRunLease }
  | { acquired: false; held_by: string; expires_at: string };

/**
 * One run per space at a time, across every Kibana node. A crashed holder loses the lease when it
 * expires.
 */
export async function acquireRunLease({
  state,
  spaceId,
  ttlMs = DEFAULT_RUN_LEASE_TTL_MS,
  now = Date.now(),
}: {
  state: StateStore;
  spaceId: string;
  ttlMs?: number;
  now?: number;
}): Promise<RunLeaseAttempt> {
  const current = await state.get({ spaceId, kind: 'lease' });

  if (current && Date.parse(current.value.expires_at) > now) {
    return { acquired: false, held_by: current.value.owner, expires_at: current.value.expires_at };
  }

  const lease = {
    owner: uuidv4(),
    acquired_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  };

  let version: StateVersion;

  try {
    // Conditional on what was read: two nodes that both saw an expired lease cannot both win.
    version = await state.put({ spaceId, kind: 'lease', value: lease, version: current?.version });
  } catch (error) {
    if (!(error instanceof StateConflictError)) {
      throw error;
    }

    const winner = await state.get({ spaceId, kind: 'lease' });

    // The winner may already be gone (released between the two reads); the space is busy either
    // way, so report the last lease seen.
    return {
      acquired: false,
      held_by: (winner?.value ?? current?.value)?.owner ?? 'unknown',
      expires_at: (winner?.value ?? current?.value)?.expires_at ?? lease.expires_at,
    };
  }

  return {
    acquired: true,
    held: {
      owner: lease.owner,
      expires_at: lease.expires_at,
      release: async () => {
        try {
          await state.delete({ spaceId, kind: 'lease', version });
        } catch (error) {
          // Someone took over our expired lease; theirs is not ours to delete.
          if (!(error instanceof StateConflictError)) {
            throw error;
          }
        }
      },
    },
  };
}
