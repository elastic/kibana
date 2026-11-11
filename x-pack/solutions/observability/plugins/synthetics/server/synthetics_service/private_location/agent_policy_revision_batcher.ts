/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

export const AGENT_POLICY_REVISION_BATCH_WINDOW_MS = 100;
export const AGENT_POLICY_REVISION_RETRY_DELAY_MS = 100;
const AGENT_POLICY_REVISION_MAX_RETRIES = 3;

interface Waiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

interface PendingPolicyRevision {
  policyId: string;
  running: boolean;
  timer?: ReturnType<typeof setTimeout>;
  /** Resolves when the in-progress bump settles; used to await a drain. */
  inFlight?: Promise<void>;
  waiters: Waiter[];
}

/**
 * Bounds {@link AgentPolicyRevisionBatcher.flushPending}. A drain pass can
 * enqueue a follow-up batch, so we loop — but never indefinitely, since a
 * shutdown flush must not outlive core's stop timeout.
 */
const MAX_DRAIN_PASSES = 10;

interface AgentPolicyRevisionBatcherDependencies {
  logger: Logger;
  bumpRevision: (policyId: string) => Promise<void>;
  random?: () => number;
}

/**
 * Coalesces concurrent revision bumps for the same Fleet agent policy.
 *
 * Batches are keyed on `policyId` alone and carry no caller state: writes for
 * one agent policy are deliberately coalesced across spaces, so there is no
 * single requesting space that is correct for the resulting bump. `bumpRevision`
 * resolves its own client instead — see PackagePolicyService.
 */
export class AgentPolicyRevisionBatcher {
  private readonly pendingByPolicy = new Map<string, PendingPolicyRevision>();

  constructor(private readonly dependencies: AgentPolicyRevisionBatcherDependencies) {}

  public async schedule(policyIds: readonly string[]): Promise<void> {
    await Promise.all([...new Set(policyIds)].map((policyId) => this.schedulePolicy(policyId)));
  }

  private schedulePolicy(policyId: string): Promise<void> {
    let pending = this.pendingByPolicy.get(policyId);

    if (!pending) {
      pending = { policyId, running: false, waiters: [] };
      this.pendingByPolicy.set(policyId, pending);
    }

    const pendingPolicyRevision = pending;
    const promise = new Promise<void>((resolve, reject) => {
      pendingPolicyRevision.waiters.push({ resolve, reject });
    });

    this.scheduleFlush(pendingPolicyRevision);
    return promise;
  }

  /**
   * Runs every pending batch now instead of waiting out its debounce window.
   *
   * Package policies are written with `bumpRevision: false` on the assumption
   * that this batcher will bump shortly after, so a pending batch dropped at
   * shutdown leaves those policies attached to an un-bumped agent policy —
   * Fleet never redeploys and the monitors silently never reach an agent. Call
   * this from the plugin's `stop()` so a graceful shutdown still deploys them.
   * An ungraceful kill (SIGKILL/OOM) still cannot be covered here; only a later
   * write to the same agent policy or a rebalance pass will reconcile that.
   */
  public async flushPending(): Promise<void> {
    for (let pass = 0; pass < MAX_DRAIN_PASSES && this.pendingByPolicy.size > 0; pass += 1) {
      const draining: Array<Promise<void>> = [];

      for (const pending of [...this.pendingByPolicy.values()]) {
        if (pending.timer) {
          clearTimeout(pending.timer);
          pending.timer = undefined;
        }
        if (!pending.running) {
          pending.inFlight = this.flush(pending);
        }
        if (pending.inFlight) {
          draining.push(pending.inFlight);
        }
      }

      if (draining.length === 0) {
        return;
      }
      // flush() settles its own waiters; allSettled keeps one failed batch from
      // abandoning the rest of the drain.
      await Promise.allSettled(draining);
    }
  }

  private scheduleFlush(pending: PendingPolicyRevision): void {
    if (pending.running || pending.timer) {
      return;
    }

    pending.timer = setTimeout(() => {
      pending.timer = undefined;
      pending.inFlight = this.flush(pending);
    }, AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
  }

  private async flush(pending: PendingPolicyRevision): Promise<void> {
    pending.running = true;
    const waiters = pending.waiters.splice(0);

    try {
      await this.bumpRevisionWithRetry(pending.policyId);
      waiters.forEach(({ resolve }) => resolve());
    } catch (error) {
      waiters.forEach(({ reject }) => reject(error as Error));
    } finally {
      pending.running = false;
      pending.inFlight = undefined;
      if (pending.waiters.length > 0) {
        this.scheduleFlush(pending);
      } else {
        this.pendingByPolicy.delete(pending.policyId);
      }
    }
  }

  private async bumpRevisionWithRetry(policyId: string): Promise<void> {
    for (let retry = 0; ; retry += 1) {
      try {
        await this.dependencies.bumpRevision(policyId);
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
