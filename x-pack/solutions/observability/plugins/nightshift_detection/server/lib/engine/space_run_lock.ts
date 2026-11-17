/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isLockAcquisitionError, withLock } from '@kbn/lock-manager';

/** Either the run happened and returned `result`, or another run held the space. */
export type SpaceRunOutcome<T> = { ran: true; result: T } | { ran: false };

const getLockId = (spaceId: string) => `nightshift-detection:run:${spaceId}`;

/**
 * One engine run per space at a time, across every Kibana node. The lock is renewed while the run
 * lasts and a crashed holder loses it when it expires.
 */
export class SpaceRunLock {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  /** Runs `callback` while holding the lock of `spaceId`, or skips it when another run holds it. */
  public async run<T>({
    spaceId,
    callback,
  }: {
    spaceId: string;
    callback: () => Promise<T>;
  }): Promise<SpaceRunOutcome<T>> {
    let started = false;

    try {
      const result = await withLock(
        {
          esClient: this.esClient,
          logger: this.logger,
          lockId: getLockId(spaceId),
          metadata: { spaceId },
        },
        () => {
          started = true;
          return callback();
        }
      );

      return { ran: true, result };
    } catch (error) {
      // A lock error thrown by the callback itself is the callback's failure, not a busy space.
      if (!started && isLockAcquisitionError(error)) {
        return { ran: false };
      }

      throw error;
    }
  }
}
