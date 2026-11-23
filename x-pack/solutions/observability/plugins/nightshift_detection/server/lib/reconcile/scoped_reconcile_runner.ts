/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { inject, injectable, optional } from 'inversify';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginSetup } from '@kbn/core-di';
import type { CPSServerSetup } from '@kbn/cps/server';
import { AccountScope } from '../engine/account_scope';
import { DetectionEngineDataClient, KnowledgeIndicators, Sources } from '../engine/tokens';
import { getErrorMessage } from '../errors/get_error_message';
import { StrategyCatalog } from '../strategies/strategy_catalog';
import type { ResourceContext } from '../strategies/types';
import {
  AlertingRuleReconciler,
  type ReconcileRulesResult,
  type SkippedSource,
  type StrategyAlertingRule,
  type StrategyError,
} from '../rules/alerting_rule_reconciler';
import { ManagedRuleReader } from '../rules/managed_rule_reader';
import { SpaceReconcileLock } from './space_reconcile_lock';

/**
 * How long a call waits for a reconciliation already running in the space. The workflow cancels a
 * run when a newer change comes in, and the cancelled run's call stops before its next request to
 * Alerting, but it may still hold the lock for a moment, having read the knowledge before that
 * change. Waiting it out lets the newer run read what is there now instead of answering busy and
 * leaving the change for the six-hour schedule. Two minutes: with the workflow's 30-second settle,
 * it leaves the reconciliation half of the workflow's five-minute timeout.
 */
const LOCK_WAIT_ATTEMPTS = 12;
const LOCK_WAIT_INTERVAL_MS = 10_000;

/** What a `_reconcile` call did: the reconciliation, or nothing because another one holds the space. */
type ReconcileRulesResponse = ({ status: 'completed' } & ReconcileRulesResult) | { status: 'busy' };

/**
 * Reconciles the space's managed rules as the account behind a request: it asks every strategy for
 * its resources in a scope built for the account, and hands their alerting rules to the reconciler.
 */
@injectable()
export class ScopedReconcileRunner {
  constructor(
    @inject(AccountScope) private readonly accountScope: AccountScope,
    @inject(StrategyCatalog) private readonly catalog: StrategyCatalog,
    @inject(SpaceReconcileLock) private readonly lock: Pick<SpaceReconcileLock, 'run'>,
    @inject(CoreLogger) private readonly logger: Logger,
    @inject(PluginSetup<CPSServerSetup>('cps'))
    @optional()
    private readonly cps: CPSServerSetup | undefined
  ) {}

  /**
   * @param accountRequest A request authenticated as the space's detection service account.
   */
  public async run({
    accountRequest,
    spaceId,
    abortSignal,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
    abortSignal: AbortSignal;
  }): Promise<ReconcileRulesResponse> {
    let attemptsLeft = LOCK_WAIT_ATTEMPTS;

    // An attempt at a time: each one waits for the previous holder to let go.
    while (attemptsLeft > 0 && !abortSignal.aborted) {
      const outcome = await this.lock.run({
        spaceId,
        callback: () => this.reconcile({ accountRequest, spaceId, abortSignal }),
      });
      if (outcome.ran) {
        return { status: 'completed', ...outcome.result };
      }

      attemptsLeft--;
      if (attemptsLeft > 0) {
        // Rejects once the call is aborted, which ends the wait.
        await sleep(LOCK_WAIT_INTERVAL_MS, undefined, { signal: abortSignal }).catch(() => {});
      }
    }

    // An aborted call has nobody to answer, and must not read as another run holding the space.
    abortSignal.throwIfAborted();
    return { status: 'busy' };
  }

  private async reconcile({
    accountRequest,
    spaceId,
    abortSignal,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
    abortSignal: AbortSignal;
  }): Promise<ReconcileRulesResult> {
    return this.accountScope.run({
      accountRequest,
      spaceId,
      fn: async (scope) => {
        // Both read the rules client bound in the fork, so they live and die with it.
        scope.bind(ManagedRuleReader).toSelf();
        scope.bind(AlertingRuleReconciler).toSelf();

        const context: ResourceContext = {
          spaceId,
          // Disabled sources too: their rules are disabled, while a rule whose source is missing is
          // deleted.
          sources: await scope.get(Sources).list({ enabledOnly: false }),
          esClient: scope.get(DetectionEngineDataClient),
          abortSignal,
          knowledge: scope.get(KnowledgeIndicators),
          cpsEnabled: this.cps?.getCpsEnabled() ?? false,
        };
        const { desired, strategyErrors, skippedSources } = await this.collectDesiredRules(context);

        // Never paused yet: nothing sets the space's maintenance state so far.
        return scope.get(AlertingRuleReconciler).reconcile({
          spaceId,
          desired,
          paused: false,
          strategyErrors,
          skippedSources,
          abortSignal,
        });
      },
    });
  }

  /** Every strategy's alerting rules; a strategy that throws is reported and keeps what it owns. */
  private async collectDesiredRules(context: ResourceContext): Promise<{
    desired: StrategyAlertingRule[];
    strategyErrors: StrategyError[];
    skippedSources: SkippedSource[];
  }> {
    const desired: StrategyAlertingRule[] = [];
    const strategyErrors: StrategyError[] = [];
    const skippedSources: SkippedSource[] = [];

    await Promise.all(
      this.catalog.list().map(async (strategy) => {
        const { descriptor } = strategy;
        if (!strategy.resources) {
          return;
        }

        try {
          const result = await strategy.resources(context);
          if (result.skipped.length > 0) {
            this.logger.debug(
              `${descriptor.id} cannot watch ${result.skipped.length} item(s) in space [${
                context.spaceId
              }]: ${result.skipped
                .map(({ source_id: id, reason }) => `${id}: ${reason}`)
                .join('; ')}`
            );
          }
          skippedSources.push(
            ...result.skipped.map(({ source_id: sourceId }) => ({
              strategy: descriptor.id,
              source_id: sourceId,
            }))
          );
          // Every resource is an alerting rule while that is the only kind.
          desired.push(
            ...result.resources.map((resource) => ({
              strategy: { id: descriptor.id, name: descriptor.name },
              resource,
            }))
          );
        } catch (error) {
          strategyErrors.push({ strategy: descriptor.id, message: getErrorMessage(error) });
        }
      })
    );

    return { desired, strategyErrors, skippedSources };
  }
}
