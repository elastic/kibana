/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { DetectionStrategy } from '../lib/strategies/detection_strategy';
import { KnownFailuresStrategy } from '../lib/strategies/known_failures/known_failures_strategy';
import { StrategyCatalog } from '../lib/strategies/strategy_catalog';

/**
 * Binds the strategy catalog. A strategy is one `bind(DetectionStrategy).to(...)` line in this
 * function, next to the catalog.
 */
export function bindStrategies({ bind }: ContainerModuleLoadOptions): void {
  bind(StrategyCatalog).toSelf().inSingletonScope();
  bind(DetectionStrategy).to(KnownFailuresStrategy).inSingletonScope();
}
