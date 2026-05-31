/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Semaphore } from '../semaphore';

describe('Semaphore', () => {
  it('allows up to max concurrent acquisitions', async () => {
    const semaphore = new Semaphore(2);

    const r1 = await semaphore.acquire();
    const r2 = await semaphore.acquire();

    expect(semaphore.getQueuedCount()).toBe(0);

    // Third acquire should block
    let acquired3 = false;
    const p3 = semaphore.acquire().then((release) => {
      acquired3 = true;
      release();
    });

    expect(semaphore.getQueuedCount()).toBe(1);
    expect(acquired3).toBe(false);

    r1();
    await p3;
    expect(acquired3).toBe(true);

    r2();
  });

  it('releases correctly and allows next waiter', async () => {
    const semaphore = new Semaphore(1);

    const release1 = await semaphore.acquire();
    let acquired2 = false;

    const p2 = semaphore.acquire().then((release2) => {
      acquired2 = true;
      release2();
    });

    expect(acquired2).toBe(false);
    release1();
    await p2;
    expect(acquired2).toBe(true);
  });

  it('defaults to 5 when initialized with 0', async () => {
    const semaphore = new Semaphore(0);
    const release = await semaphore.acquire();
    expect(semaphore.getQueuedCount()).toBe(0);
    release();
  });
});
