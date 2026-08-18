/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

export const AGENT_POLICY_REVISION_BATCH_WINDOW_MS = 100;
export const AGENT_POLICY_REVISION_RETRY_DELAY_MS = 100;
const AGENT_POLICY_REVISION_MAX_RETRIES = 3;

interface Waiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

interface PendingPolicyRevision {
  client: SavedObjectsClientContract;
  policyId: string;
  running: boolean;
  timer?: ReturnType<typeof setTimeout>;
  waiters: Waiter[];
}

interface AgentPolicyRevisionBatcherDependencies {
  logger: Logger;
  bumpRevision: (client: SavedObjectsClientContract, policyId: string) => Promise<void>;
  random?: () => number;
}

/** Coalesces concurrent revision bumps for the same Fleet agent policy. */
export class AgentPolicyRevisionBatcher {
  private readonly pendingByPolicy = new Map<string, PendingPolicyRevision>();

  constructor(private readonly dependencies: AgentPolicyRevisionBatcherDependencies) {}

  public async schedule(
    client: SavedObjectsClientContract,
    policyIds: readonly string[]
  ): Promise<void> {
    await Promise.all(
      [...new Set(policyIds)].map((policyId) => this.schedulePolicy(client, policyId))
    );
  }

  private schedulePolicy(client: SavedObjectsClientContract, policyId: string): Promise<void> {
    let pending = this.pendingByPolicy.get(policyId);

    if (!pending) {
      pending = { client, policyId, running: false, waiters: [] };
      this.pendingByPolicy.set(policyId, pending);
    }

    const pendingPolicyRevision = pending;
    const promise = new Promise<void>((resolve, reject) => {
      pendingPolicyRevision.waiters.push({ resolve, reject });
    });

    this.scheduleFlush(policyId, pendingPolicyRevision);
    return promise;
  }

  private scheduleFlush(key: string, pending: PendingPolicyRevision): void {
    if (pending.running || pending.timer) {
      return;
    }

    pending.timer = setTimeout(() => {
      pending.timer = undefined;
      void this.flush(key, pending);
    }, AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
  }

  private async flush(key: string, pending: PendingPolicyRevision): Promise<void> {
    pending.running = true;
    const waiters = pending.waiters.splice(0);

    try {
      await this.bumpRevisionWithRetry(pending.client, pending.policyId);
      waiters.forEach(({ resolve }) => resolve());
    } catch (error) {
      waiters.forEach(({ reject }) => reject(error as Error));
    } finally {
      pending.running = false;
      if (pending.waiters.length > 0) {
        this.scheduleFlush(key, pending);
      } else {
        this.pendingByPolicy.delete(key);
      }
    }
  }

  private async bumpRevisionWithRetry(
    client: SavedObjectsClientContract,
    policyId: string
  ): Promise<void> {
    for (let retry = 0; ; retry += 1) {
      try {
        await this.dependencies.bumpRevision(client, policyId);
        return;
      } catch (error) {
        if (
          !SavedObjectsErrorHelpers.isConflictError(error as Error) ||
          retry >= AGENT_POLICY_REVISION_MAX_RETRIES
        ) {
          throw error;
        }

        const backoff = AGENT_POLICY_REVISION_RETRY_DELAY_MS * 2 ** retry;
        const delay = backoff * (1 + (this.dependencies.random ?? Math.random)());
        this.dependencies.logger.debug(
          `Retrying revision bump for scalable private-location agent policy [${policyId}] after a version conflict`
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
