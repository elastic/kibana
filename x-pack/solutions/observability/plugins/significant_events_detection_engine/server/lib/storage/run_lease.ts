/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DocVersion, RunLease } from '../domain';
import { isConflictError } from '../errors';
import type { IStateStore } from './state_store';

/** A held lease. Release it in a `finally`, so a failed run never blocks the next one. */
export interface IHeldLease {
  lease: RunLease;
  release(): Promise<void>;
}

/** Result of trying to take the lease. */
export type LeaseAttempt =
  | { acquired: true; held: IHeldLease }
  | { acquired: false; holder: RunLease };

/**
 * One run per space at a time, across every Kibana node. The schedule, a person pressing Run
 * now, and a backtest all take the same lease; a crashed holder loses it when it expires.
 */
export async function acquireRunLease({
  state,
  trigger,
  durationMs,
  now = Date.now(),
}: {
  state: IStateStore;
  trigger: RunLease['trigger'];
  durationMs: number;
  now?: number;
}): Promise<LeaseAttempt> {
  const current = await state.getVersioned('lease');
  if (current && Date.parse(current.doc.expires_at) > now) {
    return { acquired: false, holder: current.doc };
  }
  const lease: RunLease = {
    owner: uuidv4(),
    trigger,
    acquired_at: new Date(now).toISOString(),
    expires_at: new Date(now + durationMs).toISOString(),
  };
  let version: DocVersion;
  try {
    // Conditional on what was read: two nodes that both saw an expired lease cannot both win.
    version = await state.put('lease', lease, {
      ...(current ? { ifVersion: current.version } : { create: true }),
      refresh: true,
    });
  } catch (error) {
    if (isConflictError(error)) {
      const winner = await state.get('lease');
      return { acquired: false, holder: winner ?? lease };
    }
    throw error;
  }
  return {
    acquired: true,
    held: {
      lease,
      release: async () => {
        try {
          await state.delete('lease', { ifVersion: version });
        } catch (error) {
          // Someone took over an expired lease; theirs is not ours to delete.
          if (!isConflictError(error)) {
            throw error;
          }
        }
      },
    },
  };
}
