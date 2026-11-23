/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { chunk } from 'lodash';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { MAX_BULK_ITEMS, type BulkResponse, type CreateRuleData } from '@kbn/alerting-v2-schemas';
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
import { DetectionRulesClient } from './rules_client_token';

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
  /** Rules not created because Alerting's schedule budget is spent; the next run tries again. */
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

/** Why Alerting refused a rule for the schedule budget, once it has in a run. */
interface ScheduleBudget {
  refusal?: string;
}

/** What the reconciler will do, worked out from what exists and what is wanted. */
interface RuleChanges {
  toDelete: string[];
  toCreate: DesiredRule[];
  toEnable: string[];
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
  const { metadata } = resource.data;
  const id = computeRuleId({
    spaceId,
    strategy: strategy.id,
    sourceId: resource.source_id,
    data: resource.data,
  });

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
    toEnable: kept
      .filter((rule) => {
        const wanted = desiredById.get(rule.id);
        return !rule.enabled && wanted !== undefined && shouldRun(wanted);
      })
      .map(({ id }) => id),
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
      'bulkCreateRules' | 'bulkDeleteRules' | 'bulkEnableRules' | 'bulkDisableRules'
    >,
    @inject(ManagedRuleReader) private readonly reader: Pick<ManagedRuleReader, 'listManaged'>,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Reconciles the space's managed rules:
   * 1. List every managed rule of the space.
   * 2. Plan the changes against the desired rules.
   * 3. Delete first, so a space at its schedule budget frees room before creating.
   * 4. Create what is missing.
   * 5. Toggle what differs.
   */
  public async reconcile({
    spaceId,
    desired,
    paused,
    strategyErrors,
    skippedSources,
  }: {
    spaceId: string;
    desired: StrategyAlertingRule[];
    paused: boolean;
    strategyErrors: StrategyError[];
    skippedSources: SkippedSource[];
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

    // 3 to 5. Sequential: deleting before creating is what frees the schedule budget.
    result.deleted = await this.runBulk({
      result,
      operation: 'delete',
      ids: changes.toDelete,
      run: (ids) => this.rulesClient.bulkDeleteRules({ ids }),
    });
    await this.create({ result, rules: changes.toCreate });
    result.enabled = await this.runBulk({
      result,
      operation: 'enable',
      ids: changes.toEnable,
      run: (ids) => this.rulesClient.bulkEnableRules({ ids }),
    });
    result.disabled = await this.runBulk({
      result,
      operation: 'disable',
      ids: changes.toDisable,
      run: (ids) => this.rulesClient.bulkDisableRules({ ids }),
    });

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
    run,
  }: {
    result: ReconcileRulesResult;
    operation: RuleOperation;
    ids: string[];
    run: (ids: string[]) => Promise<BulkResponse>;
  }): Promise<number> {
    let changed = 0;

    // One chunk at a time, so a failure is reported against the rules of its own chunk.
    for (const batch of chunk(ids, MAX_BULK_ITEMS)) {
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

  private async create({
    result,
    rules,
  }: {
    result: ReconcileRulesResult;
    rules: DesiredRule[];
  }): Promise<void> {
    const budget: ScheduleBudget = {};

    // One chunk at a time, so a failure is reported against the rules of its own chunk.
    for (const batch of chunk(rules, MAX_BULK_ITEMS)) {
      await this.createBatch({ result, batch, budget });
    }
  }

  /**
   * Creates a chunk of rules. A chunk Alerting refuses as a whole for some of its rules is split in
   * halves until those rules are alone, so the rest are still created. Once a single rule does not
   * fit the schedule budget, the enabled rules after it are skipped without asking: the budget only
   * shrinks within a run, and asking for each would scan the cluster's schedules every time.
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
    const { refusal } = budget;
    const toCreate = refusal === undefined ? batch : batch.filter(({ enabled }) => !enabled);
    if (refusal !== undefined) {
      result.skipped.push(
        ...batch
          .filter(({ enabled }) => enabled)
          .map(({ id }) => ({ rule_id: id, reason: refusal }))
      );
    }
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
        const reason = getErrorMessage(error);
        budget.refusal = reason;
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
