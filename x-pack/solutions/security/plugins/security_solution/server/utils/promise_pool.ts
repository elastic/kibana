/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError } from '@kbn/kibana-utils-plugin/common';

interface PromisePoolArgs<Item, Result> {
  concurrency?: number;
  items: Item[];
  executor: (item: Item) => Promise<Result>;
  abortSignal?: AbortSignal;
}

export interface PromisePoolError<Item, Error = unknown> {
  item: Item;
  error: Error;
}

export interface PromisePoolResult<Item, Result> {
  item: Item;
  result: Result;
}

export interface PromisePoolOutcome<Item, Result, Error = unknown> {
  results: Array<PromisePoolResult<Item, Result>>;
  errors: Array<PromisePoolError<Item, Error | AbortError>>;
}

/**
 * Runs promises in batches. It ensures that the number of running async tasks
 * doesn't exceed the concurrency parameter passed to the function.
 *
 * @param concurrency - number of tasks run in parallel
 * @param items - array of items to be passes to async executor
 * @param executor - an async function to be called with each provided item
 * @param abortSignal - AbortSignal a signal object that allows to abort executing actions
 *
 * @returns Struct holding results or errors of async tasks, aborted executions count if applicable
 */

export const initPromisePool = async <Item, Result, Error = unknown>({
  concurrency = 1,
  items,
  executor,
  abortSignal,
}: PromisePoolArgs<Item, Result>): Promise<PromisePoolOutcome<Item, Result, Error>> => {
  const tasks: Array<Promise<void>> = [];
  const outcome: PromisePoolOutcome<Item, Result, Error> = { results: [], errors: [] };

  for (const item of items) {
    // Check if the pool is full
    if (tasks.length >= concurrency) {
      // Wait for any first task to finish
      await Promise.race(tasks);
    }

    const executeItem = async () => {
      // if abort signal was sent stop processing tasks further
      if (abortSignal?.aborted === true) {
        throw new AbortError();
      }
      return executor(item);
    };

    const task: Promise<void> = executeItem()
      .then((result) => {
        outcome.results.push({ item, result });
      })
      .catch(async (error) => {
        outcome.errors.push({ item, error });
      })
      .finally(() => {
        tasks.splice(tasks.indexOf(task), 1);
      });

    tasks.push(task);
  }

  // Wait for all remaining tasks to finish
  await Promise.all(tasks);

  return outcome;
};
