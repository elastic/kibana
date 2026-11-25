/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SpaceLock } from '../locks/space_lock';

/**
 * One reconciliation per space at a time, across every Kibana node. The reconcile workflow
 * already runs one at a time; this guards a direct call racing it.
 */
export class SpaceReconcileLock extends SpaceLock {
  constructor(esClient: ElasticsearchClient, logger: Logger) {
    super(esClient, logger, 'reconcile');
  }
}
