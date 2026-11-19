/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { StrategyCatalog } from '../lib/strategies/strategy_catalog';

/**
 * Binds the strategy catalog. A strategy is one `bind(DetectionStrategy).to(...)` line in this
 * function, next to the catalog.
 */
export function bindStrategies({ bind }: ContainerModuleLoadOptions): void {
  bind(StrategyCatalog).toSelf().inSingletonScope();
}
