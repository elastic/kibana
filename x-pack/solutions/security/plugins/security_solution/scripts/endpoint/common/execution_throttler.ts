/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';

export interface ExecutionThrottlerOptions {
  concurrency?: number;
  log?: ToolingLog;
}

/**
 * Queue callback functions and execute them in parallel using the defined concurrency number. Execution of
 * callbacks starts as soon as functions start to be added to the queue (ex. Does not wait for a "batch"
 * size to be reached) and continues to process the queue until it is flushed out.
 */
export class ExecutionThrottler {
  private readonly options: Required<ExecutionThrottlerOptions>;
  private readonly queue: Array<() => Promise<any>> = [];
  private readonly executing = new Set<Promise<any>>();

  constructor({ concurrency = 10, log = createToolingLogger() }: ExecutionThrottlerOptions = {}) {
    this.options = {
      concurrency,
      log,
    };
  }

  private logCurrentState() {
    this.options.log.debug(
      `Executing count: [${this.executing.size}], Queue count: [${this.queue.length}]`
    );
  }

  private async execute(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    while (this.executing.size < this.options.concurrency && this.queue.length) {
      const callbackFn = this.queue.shift();

      if (callbackFn) {
        const callbackPromise = callbackFn();
        this.executing.add(callbackPromise);

        callbackPromise.finally(() => {
          this.executing.delete(callbackPromise);
          this.execute();
        });
      }
    }

    this.logCurrentState();
  }

  public addToQueue(fn: () => Promise<any>): void {
    this.queue.push(fn);
    this.execute();
  }

  public async complete(): Promise<void> {
    while (this.executing.size > 0) {
      this.logCurrentState();
      await Promise.all(Array.from(this.executing)).catch(() => {});
    }
  }

  public getStats(): { pending: number } {
    return {
      pending: this.queue.length,
    };
  }
}
