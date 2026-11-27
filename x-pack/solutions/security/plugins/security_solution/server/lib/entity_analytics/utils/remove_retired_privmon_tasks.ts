/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

const RETIRED_PRIVMON_TASK_TYPE = 'entity_analytics:monitoring:privileges:engine';
const PAGE_SIZE = 100;

type TaskRepository = Pick<ISavedObjectsRepository, 'find' | 'delete'>;

type DeleteOutcome =
  | { outcome: 'deleted' }
  | { outcome: 'gone' }
  | { outcome: 'failed'; error: unknown };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Deletes leftover Task Manager documents of the retired privilege monitoring task, one page at a
 * time, and returns how many it deleted. The legacy engine scheduled one task per space.
 */
export const removeRetiredPrivmonTasks = async ({
  taskRepo,
  logger,
}: {
  taskRepo: TaskRepository;
  logger: Logger;
}): Promise<number> => {
  let removed = 0;
  let hasMore = true;

  // Delete as we go, so each pass sees the next batch of remaining documents.
  while (hasMore) {
    const { saved_objects: tasks } = await taskRepo.find({
      type: 'task',
      filter: `task.attributes.taskType: "${RETIRED_PRIVMON_TASK_TYPE}"`,
      perPage: PAGE_SIZE,
    });

    const results = await Promise.all(
      tasks.map(async ({ id }): Promise<DeleteOutcome> => {
        try {
          await taskRepo.delete('task', id);
          return { outcome: 'deleted' };
        } catch (error) {
          // Another node may have deleted it first.
          return SavedObjectsErrorHelpers.isNotFoundError(error)
            ? { outcome: 'gone' }
            : { outcome: 'failed', error };
        }
      })
    );

    const deleted = results.filter(({ outcome }) => outcome === 'deleted').length;
    const gone = results.filter(({ outcome }) => outcome === 'gone').length;
    const failures = results.flatMap((result) =>
      result.outcome === 'failed' ? [result.error] : []
    );

    if (failures.length > 0) {
      logger.warn(
        `Failed to delete ${
          failures.length
        } leftover privilege monitoring task document(s): ${getErrorMessage(failures[0])}`
      );
    }

    removed += deleted;
    // A short page is the last one. A page where nothing could be deleted would be read again
    // unchanged, so stop instead of looping.
    hasMore = tasks.length === PAGE_SIZE && deleted + gone > 0;
  }

  return removed;
};
