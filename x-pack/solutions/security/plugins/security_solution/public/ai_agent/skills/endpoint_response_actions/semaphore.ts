/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CONCURRENT_ACTIONS } from './constants';

/**
 * A simple async semaphore that limits concurrent operations.
 *
 * When `acquire()` is called and the limit is reached, the caller waits
 * until one of the in-flight operations calls `release()`.
 */
export class Semaphore {
  private readonly max: number;
  private count: number;
  private readonly queue: Array<() => void>;

  constructor(maxConcurrent = MAX_CONCURRENT_ACTIONS) {
    this.max = maxConcurrent;
    this.count = 0;
    this.queue = [];
  }

  /**
   * Acquire a slot. Returns a promise that resolves when a slot is available.
   * When resolved, the caller MUST call the returned `release` function.
   */
  acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      if (this.count < this.max) {
        this.count++;
        resolve(() => {
          this.count--;
          this.dispatch();
        });
      } else {
        // Enqueue and wait for dispatch
        this.queue.push(() => {
          this.count++;
          resolve(() => {
            this.count--;
            this.dispatch();
          });
        });
      }
    });
  }

  /**
   * Dispatch the next queued waiter if there are available slots.
   */
  private dispatch(): void {
    if (this.queue.length > 0 && this.count < this.max) {
      const waiter = this.queue.shift()!;
      waiter();
    }
  }

  /**
   * Current number of in-flight operations.
   */
  getActiveCount(): number {
    return this.count;
  }

  /**
   * Number of callers waiting for a slot.
   */
  getQueuedCount(): number {
    return this.queue.length;
  }
}
