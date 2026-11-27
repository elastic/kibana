/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { StateConflictError } from '../errors/state_conflict_error';
import { InMemorySavedObjectsRepository } from '../../test_utils/in_memory_saved_objects_repository';
import { DetectionStateClient } from './detection_state_client';

const SPACE_ID = 'default';
const STRATEGY_ID = 'error_rate';

function createClient() {
  return new DetectionStateClient(new InMemorySavedObjectsRepository().asRepository());
}

const readProcessedUntil = async (client: DetectionStateClient, spaceId = SPACE_ID) =>
  (await client.readGeneratorStates({ spaceId, strategyIds: [STRATEGY_ID] })).get(STRATEGY_ID);

describe('DetectionStateClient', () => {
  describe('advanceGeneratorState', () => {
    it('moves an existing generator state forward, not only the first one', async () => {
      const client = createClient();
      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 100,
      });

      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 200,
      });

      expect(await readProcessedUntil(client)).toBe(200);
    });

    it('never moves back, so a late writer cannot undo the progress of a newer run', async () => {
      const client = createClient();
      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 200,
      });

      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 100,
      });

      expect(await readProcessedUntil(client)).toBe(200);
    });

    it('throws a conflict to the writer that lost a race, so it stops writing', async () => {
      const client = createClient();

      const outcomes = await Promise.allSettled(
        [100, 200].map((processedUntil) =>
          client.advanceGeneratorState({
            spaceId: SPACE_ID,
            strategyId: STRATEGY_ID,
            processedUntil,
          })
        )
      );

      const rejected = outcomes.filter(({ status }) => status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(StateConflictError);
    });
  });

  describe('readGeneratorStates', () => {
    it('leaves out a strategy that never ran and one that ran in another space', async () => {
      const client = createClient();
      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 100,
      });
      await client.advanceGeneratorState({
        spaceId: 'other',
        strategyId: 'other_strategy',
        processedUntil: 5,
      });

      const states = await client.readGeneratorStates({
        spaceId: SPACE_ID,
        strategyIds: [STRATEGY_ID, 'never_ran', 'other_strategy'],
      });

      expect([...states.keys()]).toEqual([STRATEGY_ID]);
      expect(await readProcessedUntil(client, 'other')).toBeUndefined();
    });

    it('does not take a checkpoint the bulk get failed to read for one that never ran', async () => {
      const repository = new InMemorySavedObjectsRepository();
      const client = new DetectionStateClient(repository.asRepository());
      await client.advanceGeneratorState({
        spaceId: SPACE_ID,
        strategyId: STRATEGY_ID,
        processedUntil: 100,
      });
      // A shard failure on one mget item comes back from the real repository as not found.
      jest.spyOn(repository, 'bulkGet').mockImplementation(async (objects) => ({
        saved_objects: objects.map(({ type, id }) => ({
          type,
          id,
          error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
        })),
      }));

      expect(await readProcessedUntil(client)).toBe(100);
    });
  });
});
