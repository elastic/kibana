/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SpaceLock } from '../locks/space_lock';

/**
 * One `_enable` per space at a time, across every Kibana node, so two setups never bind and
 * install the same space for different accounts at once.
 */
export class SpaceSetupLock extends SpaceLock {
  constructor(esClient: ElasticsearchClient, logger: Logger) {
    super(esClient, logger, 'setup');
  }
}
