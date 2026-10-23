/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forEachConcurrently } from './for_each_concurrently';

const items = async function* (count: number, events: string[]) {
  for (let item = 1; item <= count; item++) {
    events.push(`pull ${item}`);
    yield item;
  }
};

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('forEachConcurrently', () => {
  it('works on one item at a time, pulling the next only after the last is done', async () => {
    const events: string[] = [];

    await forEachConcurrently(items(3, events), 1, async (item) => {
      events.push(`start ${item}`);
      await tick();
      events.push(`end ${item}`);
    });

    expect(events).toEqual([
      'pull 1',
      'start 1',
      'end 1',
      'pull 2',
      'start 2',
      'end 2',
      'pull 3',
      'start 3',
      'end 3',
    ]);
  });

  it('never runs more items at once than the concurrency', async () => {
    let running = 0;
    let mostRunning = 0;

    await forEachConcurrently(items(10, []), 4, async () => {
      running += 1;
      mostRunning = Math.max(mostRunning, running);
      await tick();
      running -= 1;
    });

    expect(mostRunning).toBe(4);
  });

  it('stops pulling after a failure and throws it once the running items settle', async () => {
    const events: string[] = [];

    await expect(
      forEachConcurrently(items(10, events), 2, async (item) => {
        await tick();
        if (item === 2) {
          throw new Error('page 2 failed');
        }
        await tick();
        events.push(`done ${item}`);
      })
    ).rejects.toThrow('page 2 failed');

    expect(events).toContain('done 1');
    expect(events).not.toContain('pull 5');
  });

  it('waits for running items before throwing a failure of the items themselves', async () => {
    const events: string[] = [];
    const failingItems = async function* () {
      yield 1;
      throw new Error('discovery failed');
    };

    await expect(
      forEachConcurrently(failingItems(), 2, async (item) => {
        await tick();
        await tick();
        events.push(`done ${item}`);
      })
    ).rejects.toThrow('discovery failed');

    expect(events).toEqual(['done 1']);
  });
});
