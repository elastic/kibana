/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { StateConflictError } from '../errors/state_conflict_error';
import {
  DETECTION_STATE_SO_TYPE,
  type GeneratorStateAttributes,
} from './detection_state_saved_object';

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
 * The engine's state in hidden saved objects: the generator state of each strategy of a space. The
 * space is the namespace of the saved object, so a space's state goes with the space. A conditional
 * write is a saved object `version` match, and creating an object that exists is a conflict.
 */
export class DetectionStateClient {
  constructor(private readonly repository: ISavedObjectsRepository) {}

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

    // A bulk get reports an item that failed to read as not found, so an absence is only believed
    // after a plain get, which throws on a real failure. Otherwise a checkpoint that is unreadable
    // for a moment would look like a strategy that never ran, and its backlog would be skipped.
    const checkpoints = await Promise.all(
      objects.map(async (object, index) => {
        const strategyId = strategyIds[index];
        const found =
          'error' in object
            ? await this.getObject<GeneratorStateAttributes>({
                spaceId,
                id: getGeneratorStateId(strategyId),
              })
            : object;

        return found ? ([strategyId, found.attributes.processed_until] as const) : undefined;
      })
    );

    return new Map(checkpoints.filter((checkpoint) => checkpoint !== undefined));
  }

  /**
   * Moves a strategy's generator state forward. It never moves back, so a late writer cannot undo
   * the progress of a newer run.
   *
   * @throws StateConflictError when another writer changed the generator state between this read
   * and this write.
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
          refresh: false,
        });
      } else {
        await this.repository.create(DETECTION_STATE_SO_TYPE, attributes, {
          id,
          namespace: spaceId,
          refresh: false,
        });
      }
    } catch (error) {
      if (isLostWrite(error, { updating: current !== undefined })) {
        throw new StateConflictError(id);
      }

      throw error;
    }
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
}
