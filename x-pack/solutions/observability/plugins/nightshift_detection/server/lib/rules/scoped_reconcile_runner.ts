/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, optional } from 'inversify';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginSetup } from '@kbn/core-di';
import type { CPSServerSetup } from '@kbn/cps/server';
import { AccountScope } from '../engine/account_scope';
import { DetectionEngineDataClient } from '../engine/es_client_tokens';
import { KnowledgeIndicators, Sources } from '../engine/tokens';
import { getErrorMessage } from '../errors/get_error_message';
import { StrategyCatalog } from '../strategies/strategy_catalog';
import type { ResourceContext } from '../strategies/types';
import {
  AlertingRuleReconciler,
  type ReconcileRulesResult,
  type StrategyAlertingRule,
  type StrategyError,
} from './alerting_rule_reconciler';
import { ManagedRuleReader } from './managed_rule_reader';
import { SpaceRulesLock } from './space_rules_lock';

/**
 * How long a call waits for a reconciliation already running in the space. The workflow cancels a
 * run when a newer change comes in, but the cancelled run's call keeps the lock until it finishes,
 * and it may have read the knowledge before that change. Waiting it out lets the newer run read
 * what is there now instead of answering busy and leaving the change for the six-hour schedule.
 */
const LOCK_WAIT_ATTEMPTS = 6;
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
    @inject(SpaceRulesLock) private readonly lock: Pick<SpaceRulesLock, 'run'>,
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
    // An attempt at a time: each one waits for the previous holder to let go.
    for (let attempt = 1; ; attempt++) {
      const outcome = await this.lock.run({
        spaceId,
        callback: () => this.reconcile({ accountRequest, spaceId, abortSignal }),
      });

      if (outcome.ran) {
        return { status: 'completed', ...outcome.result };
      }
      if (attempt === LOCK_WAIT_ATTEMPTS || abortSignal.aborted) {
        return { status: 'busy' };
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_INTERVAL_MS));
    }
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
    const scope = await this.accountScope.fork({ accountRequest, spaceId });
    // Both read the rules client bound in the fork, so they live and die with it.
    scope.bind(ManagedRuleReader).toSelf();
    scope.bind(AlertingRuleReconciler).toSelf();

    try {
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
      const { desired, strategyErrors } = await this.collectDesiredRules(context);

      // Phase 2 never pauses: the maintenance state is wired in nightshift-program#2086.
      return await scope
        .get(AlertingRuleReconciler)
        .reconcile({ spaceId, desired, paused: false, strategyErrors });
    } finally {
      try {
        await scope.unbindAllAsync();
      } catch (error) {
        this.logger.warn(`Could not release the reconcile scope: ${getErrorMessage(error)}`);
      }
    }
  }

  /** Every strategy's alerting rules; a strategy that throws is reported and keeps what it owns. */
  private async collectDesiredRules(
    context: ResourceContext
  ): Promise<{ desired: StrategyAlertingRule[]; strategyErrors: StrategyError[] }> {
    const desired: StrategyAlertingRule[] = [];
    const strategyErrors: StrategyError[] = [];

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

    return { desired, strategyErrors };
  }
}
