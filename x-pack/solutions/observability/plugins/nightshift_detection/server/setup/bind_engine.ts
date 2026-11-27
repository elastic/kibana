/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { AccountScope } from '../lib/engine/account_scope';
import { EngineRunner } from '../lib/engine/run_engine';

/**
 * Binds the engine runner per request: it holds the tick's context and clients, which the
 * `_tick` route binds for each request before it resolves the runner. Also binds the account scope
 * that both the tick and the reconciliation run their work in.
 */
export function bindEngine({ bind }: ContainerModuleLoadOptions): void {
  bind(EngineRunner).toSelf().inRequestScope();
  // Stateless: it holds only start contracts, so one serves every request.
  bind(AccountScope).toSelf().inSingletonScope();
}
