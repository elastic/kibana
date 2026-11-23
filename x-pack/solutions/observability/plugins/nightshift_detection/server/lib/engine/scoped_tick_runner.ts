/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { inject, injectable } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import { AccountScope } from './account_scope';
import { EngineRunner } from './run_engine';
import type { TickResult } from './tick_result';
import { RunContext } from './tokens';

const MINUTE_MS = 60_000;

/**
 * Runs one engine tick as the account behind a request. It builds a scope for that tick, binds the
 * tick's context in it, and resolves the `EngineRunner` in the fork, so the runner itself knows no
 * identity.
 */
@injectable()
export class ScopedTickRunner {
  constructor(@inject(AccountScope) private readonly accountScope: AccountScope) {}

  /**
   * @param accountRequest A request authenticated as the space's detection service account.
   */
  public async run({
    accountRequest,
    spaceId,
    skipBacklog,
    abortSignal,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
    skipBacklog: boolean;
    abortSignal: AbortSignal;
  }): Promise<TickResult> {
    const now = Date.now();

    return this.accountScope.run({
      accountRequest,
      spaceId,
      fn: (scope) => {
        // What the tick provides to the runner. The runner is bound in the fork too, so its
        // dependencies resolve from here.
        scope.bind(RunContext).toConstantValue({
          spaceId,
          runId: uuidv4(),
          scheduledMinute: Math.floor(now / MINUTE_MS) * MINUTE_MS,
        });
        scope.bind(EngineRunner).toSelf();

        return scope.get(EngineRunner).run({ now, skipBacklog, abortSignal });
      },
    });
  }
}
