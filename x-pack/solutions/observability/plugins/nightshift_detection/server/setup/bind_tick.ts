/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { AccountScope } from '../lib/engine/account_scope';
import { ScopedTickRunner } from '../lib/engine/scoped_tick_runner';

/** Binds the runner that builds a scope from a request and runs a tick in it. */
export function bindTick({ bind }: ContainerModuleLoadOptions): void {
  // Shared with the rule reconciliation, which runs as the same account.
  bind(AccountScope).toSelf().inSingletonScope();
  bind(ScopedTickRunner).toSelf().inSingletonScope();
}
