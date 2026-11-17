/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { StateConflictError } from '../errors/state_conflict_error';
import {
  DETECTION_STATE_SO_TYPE,
  type GeneratorStateAttributes,
  type RunLeaseAttributes,
} from './detection_state_saved_object';

/**
 * Meant to be longer than a run. The lease is never renewed, so the runner must finish within a
 * budget below this TTL, or a takeover can overlap a live run. Short enough that a crashed holder
 * blocks the space for one or two ticks only.
 */
export const DEFAULT_RUN_LEASE_TTL_MS = 6 * 60_000;

const LEASE_ID = 'lease';

/** A lease this process holds. */
export interface HeldRunLease {
  owner: string;
  expires_at: string;
  /** Ends the lease if it is still ours. Call it in a `finally`. */
  release(): Promise<void>;
}

/** Either the lease is ours, or the space is busy and the holder is named. */
export type RunLeaseAttempt =
  | { acquired: true; held: HeldRunLease }
  | { acquired: false; held_by: string; expires_at: string };

function getGeneratorStateId(strategyId: string) {
  return `generator_state:${strategyId}`;
}

/** A write that lost to another writer, or whose object is gone since it was read. */
function isLostWrite(error: unknown, { updating }: { updating: boolean }) {
  return (
    error instanceof Error &&
    (SavedObjectsErrorHelpers.isConflictError(error) ||
      (updating && SavedObjectsErrorHelpers.isNotFoundError(error)))
  );
}

/**
 * The engine's state in hidden saved objects: the run lease of a space and the generator state of
 * each of its strategies. The space is the namespace of the saved object, so a space's state goes
 * with the space. A conditional write is a saved object `version` match, and creating an object
 * that exists is a conflict.
 */
export class DetectionStateClient {
  constructor(private readonly repository: ISavedObjectsRepository) {}

  /**
   * One run per space at a time, across every Kibana node. A crashed holder loses the lease when it
   * expires.
   */
  public async acquireLease({
    spaceId,
    ttlMs = DEFAULT_RUN_LEASE_TTL_MS,
    now = Date.now(),
  }: {
    spaceId: string;
    ttlMs?: number;
    now?: number;
  }): Promise<RunLeaseAttempt> {
    const current = await this.getLease(spaceId);

    if (current && Date.parse(current.attributes.expires_at) > now) {
      return {
        acquired: false,
        held_by: current.attributes.owner,
        expires_at: current.attributes.expires_at,
      };
    }

    const lease: RunLeaseAttributes = {
      owner: uuidv4(),
      acquired_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    };

    let version: string | undefined;

    try {
      // Conditional on what was read: two nodes that both saw an expired lease cannot both win.
      version = await this.writeLease({ spaceId, lease, version: current?.version });
    } catch (error) {
      if (!(error instanceof StateConflictError)) {
        throw error;
      }

      const winner = (await this.getLease(spaceId))?.attributes ?? current?.attributes;

      // The winner may already be gone; the space is busy either way, so report the last lease
      // seen.
      return {
        acquired: false,
        held_by: winner?.owner ?? 'unknown',
        expires_at: winner?.expires_at ?? lease.expires_at,
      };
    }

    return {
      acquired: true,
      held: {
        owner: lease.owner,
        expires_at: lease.expires_at,
        release: async () => {
          try {
            // Expired from the moment it was acquired, so it is free for the next acquirer. A
            // saved object cannot be deleted conditionally.
            await this.writeLease({
              spaceId,
              lease: { ...lease, expires_at: lease.acquired_at },
              version,
            });
          } catch (error) {
            // Someone took over our expired lease; theirs is not ours to end.
            if (!(error instanceof StateConflictError)) {
              throw error;
            }
          }
        },
      },
    };
  }

  /**
   * The end of the last fully processed minute of each strategy, in epoch milliseconds. A strategy
   * that never ran is absent.
   */
  public async readGeneratorStates({
    spaceId,
    strategyIds,
  }: {
    spaceId: string;
    strategyIds: string[];
  }): Promise<Map<string, number>> {
    const { saved_objects: objects } = await this.repository.bulkGet<GeneratorStateAttributes>(
      strategyIds.map((strategyId) => ({
        type: DETECTION_STATE_SO_TYPE,
        id: getGeneratorStateId(strategyId),
      })),
      { namespace: spaceId }
    );

    return new Map(
      objects.flatMap((object, index) =>
        'error' in object ? [] : [[strategyIds[index], object.attributes.processed_until] as const]
      )
    );
  }

  /**
   * Moves a strategy's generator state forward. It never moves back, so a late writer cannot undo
   * the progress of a newer run.
   *
   * @throws StateConflictError when the caller's lease expired and another node took over, so the
   * caller must stop writing.
   */
  public async advanceGeneratorState({
    spaceId,
    strategyId,
    processedUntil,
  }: {
    spaceId: string;
    strategyId: string;
    processedUntil: number;
  }): Promise<void> {
    const id = getGeneratorStateId(strategyId);
    const current = await this.getObject<GeneratorStateAttributes>({ spaceId, id });

    if (current && current.attributes.processed_until >= processedUntil) {
      return;
    }

    const attributes: GeneratorStateAttributes = { processed_until: processedUntil };

    try {
      if (current) {
        await this.repository.update(DETECTION_STATE_SO_TYPE, id, attributes, {
          version: current.version,
          namespace: spaceId,
        });
      } else {
        await this.repository.create(DETECTION_STATE_SO_TYPE, attributes, {
          id,
          namespace: spaceId,
        });
      }
    } catch (error) {
      if (isLostWrite(error, { updating: current !== undefined })) {
        throw new StateConflictError(id);
      }

      throw error;
    }
  }

  private getLease(spaceId: string) {
    return this.getObject<RunLeaseAttributes>({ spaceId, id: LEASE_ID });
  }

  private async getObject<TAttributes>({ spaceId, id }: { spaceId: string; id: string }) {
    try {
      return await this.repository.get<TAttributes>(DETECTION_STATE_SO_TYPE, id, {
        namespace: spaceId,
      });
    } catch (error) {
      if (error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  /** Creates the lease, or replaces the one at `version`; returns the new version. */
  private async writeLease({
    spaceId,
    lease,
    version,
  }: {
    spaceId: string;
    lease: RunLeaseAttributes;
    version?: string;
  }): Promise<string | undefined> {
    try {
      const written = version
        ? await this.repository.update(DETECTION_STATE_SO_TYPE, LEASE_ID, lease, {
            version,
            namespace: spaceId,
          })
        : await this.repository.create(DETECTION_STATE_SO_TYPE, lease, {
            id: LEASE_ID,
            namespace: spaceId,
          });

      return written.version;
    } catch (error) {
      if (isLostWrite(error, { updating: version !== undefined })) {
        throw new StateConflictError(LEASE_ID);
      }

      throw error;
    }
  }
}
