/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { chunk } from 'lodash';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  MAX_BULK_ITEMS,
  parseDurationToMs,
  type BulkResponse,
  type CreateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import { Logger as CoreLogger } from '@kbn/core-di';
import { inject, injectable } from 'inversify';
import { getErrorMessage } from '../errors/get_error_message';
import type { AlertingRuleResource } from '../strategies/types';
import { ManagedRuleReader, type ManagedRule } from './managed_rule_reader';
import {
  computeRuleId,
  getManagedRuleName,
  getManagedRuleTags,
  getOwningStrategy,
  getWatchedSource,
} from './rule_identity';
import { DetectionRulesClient } from './tokens';

/** An `alerting_rule` resource and the strategy that wants it. */
export interface StrategyAlertingRule {
  strategy: { id: string; name: string };
  resource: AlertingRuleResource;
}

/** A strategy whose `resources()` failed; it keeps everything it owns. */
export interface StrategyError {
  strategy: string;
  message: string;
}

/** A source a strategy cannot watch for now; its rules stay as they are. */
export interface SkippedSource {
  strategy: string;
  source_id: string;
}

/** What one reconciliation changed, and what it could not. */
export interface ReconcileRulesResult {
  created: number;
  deleted: number;
  enabled: number;
  disabled: number;
  /**
   * Rules not created or turned on because Alerting's schedule budget is spent; the next run tries
   * again.
   */
  skipped: Array<{ rule_id: string; reason: string }>;
  failures: Array<{ rule_id: string; operation: RuleOperation; message: string }>;
  strategy_errors: StrategyError[];
}

type RuleOperation = 'create' | 'delete' | 'enable' | 'disable';

/** A desired rule with the identity the engine gives it. */
interface DesiredRule {
  id: string;
  enabled: boolean;
  data: CreateRuleData;
}

/**
 * The cheapest rule Alerting refused for the schedule budget in a run, and why. A rule that runs at
 * least as often cannot fit either, since the budget only shrinks within a run, so it is skipped
 * without asking; a rule that runs less often is still asked for.
 */
interface ScheduleBudget {
  refusal?: { reason: string; runsPerMinute: number };
}

/** How many runs a minute a rule adds to Alerting's schedule budget once it is on. */
const getRunsPerMinute = ({ data }: DesiredRule): number =>
  60_000 / parseDurationToMs(data.schedule.every);

/** Why a rule is skipped without asking: the budget refused one that runs no more often. */
const getBudgetRefusal = ({
  budget: { refusal },
  rule,
}: {
  budget: ScheduleBudget;
  rule: DesiredRule;
}): string | undefined =>
  rule.enabled && refusal !== undefined && getRunsPerMinute(rule) >= refusal.runsPerMinute
    ? refusal.reason
    : undefined;

/** What the reconciler will do, worked out from what exists and what is wanted. */
interface RuleChanges {
  toDelete: string[];
  toCreate: DesiredRule[];
  toEnable: DesiredRule[];
  toDisable: string[];
}

/** Stamps a strategy's rule with the engine's id, ownership tags and name. */
const toDesiredRule = ({
  spaceId,
  rule: { strategy, resource },
}: {
  spaceId: string;
  rule: StrategyAlertingRule;
}) => {
  const { metadata, ...rule } = resource.data;
  const id = computeRuleId({ spaceId, strategy: strategy.id, sourceId: resource.source_id, rule });

  return {
    id,
    enabled: resource.enabled,
    data: {
      ...resource.data,
      metadata: {
        ...metadata,
        name: getManagedRuleName({ strategyName: strategy.name, title: metadata.name, ruleId: id }),
        tags: getManagedRuleTags({ strategy: strategy.id, sourceId: resource.source_id }),
      },
    },
  };
};

const toSourceKey = ({ strategy, source_id: sourceId }: SkippedSource) =>
  JSON.stringify([strategy, sourceId]);

/**
 * Works out the changes that take the managed rules to the desired ones. Pure, so every case is
 * tested without a rules client.
 * - A rule nobody wants is deleted, unless its strategy failed or skipped its source: those rules
 *   stay as they are until the strategy can tell again what it wants.
 * - A wanted rule that is missing is created, enabled only when wanted enabled and not paused.
 * - A rule whose `enabled` differs is toggled; `paused` turns every rule off.
 * - A query is never edited: a changed query has a new id, so the old rule goes and a new one comes.
 * - A rule someone edits by hand in Alerting keeps its id, so it is kept as edited and its rows are
 *   read as the strategy's until the strategy wants a different rule. Only the id is compared:
 *   hashing what Alerting returns would flag every rule whose defaults Alerting filled in.
 */
const planRuleChanges = ({
  existing,
  desired,
  paused,
  failedStrategies,
  skippedSources,
}: {
  existing: ManagedRule[];
  desired: DesiredRule[];
  paused: boolean;
  failedStrategies: Set<string>;
  skippedSources: Set<string>;
}): RuleChanges => {
  const desiredById = new Map(desired.map((rule) => [rule.id, rule]));
  const existingById = new Map(existing.map((rule) => [rule.id, rule]));
  const shouldRun = (rule: DesiredRule) => rule.enabled && !paused;

  const kept = existing.filter((rule) => {
    const owner = getOwningStrategy(rule.tags);
    const source = getWatchedSource(rule.tags);
    return (
      desiredById.has(rule.id) ||
      (owner !== undefined &&
        (failedStrategies.has(owner) ||
          (source !== undefined &&
            skippedSources.has(toSourceKey({ strategy: owner, source_id: source })))))
    );
  });
  const keptIds = new Set(kept.map(({ id }) => id));

  return {
    toDelete: existing.filter(({ id }) => !keptIds.has(id)).map(({ id }) => id),
    toCreate: [...desiredById.values()]
      .filter(({ id }) => !existingById.has(id))
      .map((rule) => ({ ...rule, enabled: shouldRun(rule) })),
    toEnable: kept.flatMap((rule) => {
      const wanted = desiredById.get(rule.id);
      return !rule.enabled && wanted !== undefined && shouldRun(wanted) ? [wanted] : [];
    }),
    toDisable: kept
      .filter((rule) => {
        const wanted = desiredById.get(rule.id);
        // A failed strategy's or skipped source's rules keep their state, unless the space is paused.
        return rule.enabled && (paused || (wanted !== undefined && !shouldRun(wanted)));
      })
      .map(({ id }) => id),
  };
};

/** The Alerting error code a refused request carries, if any. */
const getAlertingErrorCode = (error: unknown): string | undefined =>
  isBoom(error) &&
  typeof error.data === 'object' &&
  error.data !== null &&
  'code' in error.data &&
  typeof error.data.code === 'string'
    ? error.data.code
    : undefined;

/**
 * Errors Alerting answers a whole create request with although they come from some of its rules: a
 * schedule budget the request does not fit, or rule data that fails validation. A chunk refused with
 * one is split, so the rules that are fine are still created.
 */
const SPLITTABLE_CREATE_ERRORS = new Set<string>([
  ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
  ALERTING_ERROR_CODES.SCHEDULE_INTERVAL_TOO_SHORT,
  ALERTING_ERROR_CODES.INVALID_RULE_DATA,
]);

/**
 * Delete errors that still leave the rule gone: it was gone already, or Alerting deleted it but its
 * executor task lingers, which Alerting logs and halts itself.
 */
const TOLERATED_DELETE_ERRORS = new Set<string>([
  ALERTING_ERROR_CODES.RULE_NOT_FOUND,
  ALERTING_ERROR_CODES.TASK_MANAGER_DRIFT,
]);

/**
 * Keeps the space's managed Alerting v2 rules equal to what the strategies want. Every chunk of
 * every operation runs on its own: a failed chunk is reported and the others still apply, so a
 * partial run leaves the rules closer to the goal and the next run finishes the job.
 */
@injectable()
export class AlertingRuleReconciler {
  constructor(
    @inject(DetectionRulesClient)
    private readonly rulesClient: Pick<
      RulesClientApi,
      'bulkCreateRules' | 'bulkDeleteRules' | 'enableRule' | 'bulkDisableRules'
    >,
    @inject(ManagedRuleReader) private readonly reader: Pick<ManagedRuleReader, 'listManaged'>,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Reconciles the space's managed rules:
   * 1. List every managed rule of the space.
   * 2. Plan the changes against the desired rules.
   * 3. Delete and turn off first, so a space at its schedule budget frees room before adding.
   * 4. Create what is missing.
   * 5. Turn on what should run.
   * An aborted call stops before its next request to Alerting, so it lets go of the space soon.
   */
  public async reconcile({
    spaceId,
    desired,
    paused,
    strategyErrors,
    skippedSources,
    abortSignal,
  }: {
    spaceId: string;
    desired: StrategyAlertingRule[];
    paused: boolean;
    strategyErrors: StrategyError[];
    skippedSources: SkippedSource[];
    abortSignal: AbortSignal;
  }): Promise<ReconcileRulesResult> {
    const result: ReconcileRulesResult = {
      created: 0,
      deleted: 0,
      enabled: 0,
      disabled: 0,
      skipped: [],
      failures: [],
      strategy_errors: strategyErrors,
    };

    // 1.
    const existing = await this.reader.listManaged();

    // 2.
    const changes = planRuleChanges({
      existing,
      desired: desired.map((rule) => toDesiredRule({ spaceId, rule })),
      paused,
      failedStrategies: new Set(strategyErrors.map(({ strategy }) => strategy)),
      skippedSources: new Set(skippedSources.map(toSourceKey)),
    });

    // 3 to 5. Sequential: deleting and turning off before adding is what frees the schedule budget.
    const budget: ScheduleBudget = {};
    result.deleted = await this.runBulk({
      result,
      operation: 'delete',
      ids: changes.toDelete,
      abortSignal,
      run: (ids) => this.rulesClient.bulkDeleteRules({ ids }),
    });
    result.disabled = await this.runBulk({
      result,
      operation: 'disable',
      ids: changes.toDisable,
      abortSignal,
      run: (ids) => this.rulesClient.bulkDisableRules({ ids }),
    });
    // One chunk at a time, so a failure is reported against the rules of its own chunk.
    for (const batch of chunk(changes.toCreate, MAX_BULK_ITEMS)) {
      abortSignal.throwIfAborted();
      await this.createBatch({ result, batch, budget });
    }
    await this.enable({ result, rules: changes.toEnable, budget, abortSignal });

    this.logger.info(
      `Reconciled the detection rules of space [${spaceId}]: ${result.created} created, ${result.deleted} deleted, ${result.enabled} enabled, ${result.disabled} disabled, ${result.skipped.length} skipped, ${result.failures.length} failed, ${result.strategy_errors.length} strategies failed`
    );

    return result;
  }

  /** Runs a by-id bulk operation chunk by chunk and returns how many rules it changed. */
  private async runBulk({
    result,
    operation,
    ids,
    abortSignal,
    run,
  }: {
    result: ReconcileRulesResult;
    operation: RuleOperation;
    ids: string[];
    abortSignal: AbortSignal;
    run: (ids: string[]) => Promise<BulkResponse>;
  }): Promise<number> {
    let changed = 0;

    // One chunk at a time, so a failure is reported against the rules of its own chunk.
    for (const batch of chunk(ids, MAX_BULK_ITEMS)) {
      abortSignal.throwIfAborted();
      try {
        const { affected_count: affectedCount, errors } = await run(batch);
        const failed = errors.filter(
          ({ error }) => operation !== 'delete' || !TOLERATED_DELETE_ERRORS.has(error.code)
        );
        changed += affectedCount;
        result.failures.push(
          ...failed.map(({ id, error }) => ({ rule_id: id, operation, message: error.message }))
        );
      } catch (error) {
        result.failures.push(
          ...batch.map((id) => ({ rule_id: id, operation, message: getErrorMessage(error) }))
        );
      }
    }

    return changed;
  }

  /**
   * Turns rules on one at a time: Alerting checks the schedule budget only when it enables a single
   * rule, and its bulk enable would let a re-enabled source push the cluster past it.
   */
  private async enable({
    result,
    rules,
    budget,
    abortSignal,
  }: {
    result: ReconcileRulesResult;
    rules: DesiredRule[];
    budget: ScheduleBudget;
    abortSignal: AbortSignal;
  }): Promise<void> {
    // One rule at a time: each check reads the budget the previous one left.
    for (const rule of rules) {
      abortSignal.throwIfAborted();
      const refusal = getBudgetRefusal({ budget, rule });
      if (refusal !== undefined) {
        result.skipped.push({ rule_id: rule.id, reason: refusal });
        continue;
      }

      try {
        await this.rulesClient.enableRule({ id: rule.id });
        result.enabled++;
      } catch (error) {
        const reason = getErrorMessage(error);
        if (
          getAlertingErrorCode(error) === ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED
        ) {
          budget.refusal = { reason, runsPerMinute: getRunsPerMinute(rule) };
          result.skipped.push({ rule_id: rule.id, reason });
        } else {
          result.failures.push({ rule_id: rule.id, operation: 'enable', message: reason });
        }
      }
    }
  }

  /**
   * Creates a chunk of rules. A chunk Alerting refuses as a whole for some of its rules is split in
   * halves until those rules are alone, so the rest are still created. Once a single rule does not
   * fit the schedule budget, the enabled rules that run at least as often are skipped without
   * asking: asking for each would scan the cluster's schedules every time.
   */
  private async createBatch({
    result,
    batch,
    budget,
  }: {
    result: ReconcileRulesResult;
    batch: DesiredRule[];
    budget: ScheduleBudget;
  }): Promise<void> {
    const checked = batch.map((rule) => ({ rule, refusal: getBudgetRefusal({ budget, rule }) }));
    const toCreate = checked.filter(({ refusal }) => refusal === undefined).map(({ rule }) => rule);
    result.skipped.push(
      ...checked.flatMap(({ rule, refusal }) =>
        refusal === undefined ? [] : [{ rule_id: rule.id, reason: refusal }]
      )
    );
    if (toCreate.length === 0) {
      return;
    }

    try {
      const { items, errors } = await this.rulesClient.bulkCreateRules({
        items: toCreate.map(({ id, enabled, data }) => ({ ...data, id, enabled })),
      });
      result.created += items.length;
      // A rule another run created in between is what this one wanted.
      result.failures.push(
        ...errors
          .filter(({ error }) => error.code !== ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS)
          .map(({ index, error }) => ({
            rule_id: toCreate[index].id,
            operation: 'create' as const,
            message: error.message,
          }))
      );
    } catch (error) {
      const code = getAlertingErrorCode(error);

      if (toCreate.length > 1 && code !== undefined && SPLITTABLE_CREATE_ERRORS.has(code)) {
        const middle = Math.ceil(toCreate.length / 2);
        await this.createBatch({ result, batch: toCreate.slice(0, middle), budget });
        await this.createBatch({ result, batch: toCreate.slice(middle), budget });
        return;
      }
      if (code === ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED) {
        // A single rule by now: the split above leaves a refused chunk of one.
        const reason = getErrorMessage(error);
        budget.refusal = { reason, runsPerMinute: getRunsPerMinute(toCreate[0]) };
        result.skipped.push(...toCreate.map(({ id }) => ({ rule_id: id, reason })));
        return;
      }
      result.failures.push(
        ...toCreate.map(({ id }) => ({
          rule_id: id,
          operation: 'create' as const,
          message: getErrorMessage(error),
        }))
      );
    }
  }
}
