/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SpaceLock } from '../locks/space_lock';
import type { SpaceLockOutcome } from '../locks/space_lock';

/** Either the run happened and returned `result`, or another run held the space. */
export type SpaceRunOutcome<T> = SpaceLockOutcome<T>;

/** One engine run per space at a time, across every Kibana node. */
export class SpaceRunLock extends SpaceLock {
  constructor(esClient: ElasticsearchClient, logger: Logger) {
    super(esClient, logger, 'run');
  }
}
