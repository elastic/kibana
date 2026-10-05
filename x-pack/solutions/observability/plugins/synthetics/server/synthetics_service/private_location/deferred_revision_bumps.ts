/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collects the agent policy ids whose revision bump a multi-write operation
 * (e.g. a paged maintenance-window sync) wants to issue once, at the end,
 * instead of once per write.
 *
 * Writes that take part were made with `bumpRevision: false`, so Fleet does not
 * redeploy them until {@link flush} runs. Callers must flush once they are
 * done — also when they fail part-way.
 */
export class DeferredRevisionBumps {
  private readonly policyIds = new Set<string>();
  private flushed = false;

  constructor(private readonly schedule: (policyIds: string[]) => Promise<void>) {}

  /**
   * Records policy ids to bump on {@link flush}. Once flushed, bumps right away
   * instead: a write can still be in flight when its sibling fails fast and the
   * caller flushes, and that write's bump must not be dropped.
   */
  public add(policyIds: readonly string[]): Promise<void> {
    if (this.flushed) {
      return this.schedule([...policyIds]);
    }
    policyIds.forEach((policyId) => this.policyIds.add(policyId));
    return Promise.resolve();
  }

  /**
   * Bumps every collected agent policy once. Every policy is attempted even if
   * another fails, so one bad bump does not leave the rest undeployed; the
   * failures are reported together afterwards.
   */
  public async flush(): Promise<void> {
    this.flushed = true;
    const policyIds = [...this.policyIds];
    this.policyIds.clear();

    const results = await Promise.allSettled(
      policyIds.map((policyId) => this.schedule([policyId]))
    );
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected' ? [{ policyId: policyIds[index], reason: result.reason }] : []
    );

    if (failures.length > 0) {
      const [{ reason }] = failures;
      throw new Error(
        `Failed to bump the revision of ${failures.length} of ${
          policyIds.length
        } agent policies [${failures.map(({ policyId }) => policyId).join(', ')}]: ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      );
    }
  }
}
