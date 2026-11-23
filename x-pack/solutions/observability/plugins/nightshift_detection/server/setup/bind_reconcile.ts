/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger } from '@kbn/core-di';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { ScopedReconcileRunner } from '../lib/reconcile/scoped_reconcile_runner';
import { SpaceReconcileLock } from '../lib/reconcile/space_reconcile_lock';

/** Binds what reconciles the resources the strategies need, such as their alerting rules. */
export function bindReconcile({ bind }: ContainerModuleLoadOptions): void {
  // Shares `.kibana_locks` with the run and setup locks; the purposes never block each other.
  bind(SpaceReconcileLock)
    .toResolvedValue(
      (esClient, logger) => new SpaceReconcileLock(esClient, logger.get('reconcile-lock')),
      [DetectionEngineSystemClient, Logger]
    )
    .inSingletonScope();
  bind(ScopedReconcileRunner).toSelf().inSingletonScope();
}
