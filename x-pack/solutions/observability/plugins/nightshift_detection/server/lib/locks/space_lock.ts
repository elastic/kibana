/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getLock, isLockAcquisitionError, withLock } from '@kbn/lock-manager';

/** Either the callback ran and returned `result`, or another holder had the space's lock. */
export type SpaceLockOutcome<T> = { ran: true; result: T } | { ran: false };

/**
 * One holder per space and purpose at a time, across every Kibana node. The lock is renewed while
 * the callback runs and a crashed holder loses it when it expires. A purpose is a kind of work that
 * must not overlap with itself in a space, such as `run` or `setup`: two purposes never block each
 * other.
 */
export class SpaceLock {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly purpose: string
  ) {}

  /** Runs `callback` while holding the lock of `spaceId`, or skips it when another holder has it. */
  public async run<T>({
    spaceId,
    callback,
  }: {
    spaceId: string;
    callback: () => Promise<T>;
  }): Promise<SpaceLockOutcome<T>> {
    const lockId = `nightshift-detection:${this.purpose}:${spaceId}`;
    let started = false;

    const attempt = async (): Promise<SpaceLockOutcome<T> | undefined> => {
      try {
        const result = await withLock(
          { esClient: this.esClient, logger: this.logger, lockId, metadata: { spaceId } },
          () => {
            started = true;
            return callback();
          }
        );

        return { ran: true, result };
      } catch (error) {
        // A lock error thrown by the callback itself is the callback's failure, not a busy space.
        if (started || !isLockAcquisitionError(error)) {
          throw error;
        }

        return undefined;
      }
    };

    // The lock manager also fails to acquire when Elasticsearch times out or refuses the write, and
    // it does not say which. A live lock document means another holder has the space. No document
    // may mean the holder finished between the two requests, so acquire once more before calling
    // it a broken lock backend, which must not read as a busy space tick after tick.
    const first = await attempt();
    if (first) {
      return first;
    }
    if (await getLock({ esClient: this.esClient, logger: this.logger, lockId })) {
      return { ran: false };
    }

    const second = await attempt();
    if (second) {
      return second;
    }
    if (await getLock({ esClient: this.esClient, logger: this.logger, lockId })) {
      return { ran: false };
    }

    throw new Error(
      `Could not take the ${this.purpose} lock of space [${spaceId}], and no other holder has it`
    );
  }
}
