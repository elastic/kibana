/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger } from '@kbn/core-di';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { ScopedReconcileRunner } from '../lib/rules/scoped_reconcile_runner';
import { SpaceRulesLock } from '../lib/rules/space_rules_lock';

/** Binds what reconciles the space's managed alerting rules with what the strategies want. */
export function bindRules({ bind }: ContainerModuleLoadOptions): void {
  // Shares `.kibana_locks` with the run and setup locks; the purposes never block each other.
  bind(SpaceRulesLock)
    .toResolvedValue(
      (esClient, logger) => new SpaceRulesLock(esClient, logger.get('rules-lock')),
      [DetectionEngineSystemClient, Logger]
    )
    .inSingletonScope();
  bind(ScopedReconcileRunner).toSelf().inSingletonScope();
}
