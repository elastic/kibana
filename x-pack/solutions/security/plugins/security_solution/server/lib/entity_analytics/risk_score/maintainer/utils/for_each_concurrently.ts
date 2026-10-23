/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs `work` on each item of `items`, with at most `concurrency` running at once. The next item
 * is only pulled once a slot is free, so with a concurrency of 1 items are pulled and worked on
 * strictly one after another.
 *
 * The first failure, of `work` or of `items`, stops pulling new items. It's thrown once every
 * running `work` has settled, so nothing is left running when this returns or throws.
 */
export const forEachConcurrently = async <T>(
  items: AsyncIterable<T>,
  concurrency: number,
  work: (item: T) => Promise<void>
): Promise<void> => {
  const running = new Set<Promise<void>>();
  const state: { failure?: { error: unknown } } = {};

  try {
    for await (const item of items) {
      const task: Promise<void> = work(item)
        .catch((error: unknown) => {
          state.failure ??= { error };
        })
        .finally(() => {
          running.delete(task);
        });
      running.add(task);

      if (running.size >= Math.max(1, concurrency)) {
        await Promise.race(running);
      }
      if (state.failure) {
        break;
      }
    }
  } finally {
    await Promise.all(running);
  }

  if (state.failure) {
    throw state.failure.error;
  }
};
