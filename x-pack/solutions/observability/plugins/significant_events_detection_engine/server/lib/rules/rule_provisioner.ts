/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { SignalStrategyId, EngineConfig, StrategyRulesState } from '../../../common';
import { SIGNAL_STRATEGY_IDS } from '../../../common';
import type { EngineRulesRecord, OwnedRule } from '../domain';
import { getErrorMessage } from '../errors';
import { ENGINE_RULE_TAG, STRATEGY_TAG_PREFIX } from '../strategies/rule_definitions';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { DesiredRule, RuleSpecContext, RunningDetector } from '../strategies/types';

/** Alerting v2 accepts at most this many rules per bulk call. */
const BULK_CHUNK = 100;
const FIND_PAGE_SIZE = 500;
const ALREADY_EXISTS = 'RULE_ALREADY_EXISTS';

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );
}

/**
 * Hash of everything the engine's rules are built from. When it changes, the rules are rebuilt
 * on the next run instead of waiting for the periodic reconciliation.
 */
export function computeRulesInputsHash({
  config,
  sources,
  queryLinks,
  detectors,
  cpsEnabled,
}: {
  config: EngineConfig;
  sources: NightshiftSource[];
  /** A KI added, removed or edited changes the rule that counts KI matches. */
  queryLinks: QueryLink[];
  /** A detector added or retired changes the rule that counts learned detectors. */
  detectors: RunningDetector[];
  cpsEnabled: boolean;
}): string {
  const inputs = {
    modes: SIGNAL_STRATEGY_IDS.filter((id) => STRATEGIES[id].desiredRules).map((id) => [
      id,
      config.strategies[id].mode === 'off',
    ]),
    sources: [...sources]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((source) => [source.id, source.view_name, source.type, source.esql_updated_at]),
    kis: queryLinks
      .filter((link) => link.query.type === 'match')
      .map((link) => [link.source_id, link.query.id, link.query.esql.query])
      .sort((a, b) => a.join('|').localeCompare(b.join('|'))),
    // The mode is left out: a detector moving from trial to live keeps the same rule.
    detectors: detectors
      .map((detector) => [
        detector.source_id,
        detector.detector_id,
        detector.service,
        detector.condition,
      ])
      .sort((a, b) => a.join('|').localeCompare(b.join('|'))),
    cpsEnabled,
  };
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

/** Every rule the engine owns in the space, whatever state it is in, with its strategy. */
async function findOwnedRules(
  rulesClient: RulesClientApi
): Promise<Map<string, SignalStrategyId | undefined>> {
  const rules = new Map<string, SignalStrategyId | undefined>();
  let page = 1;
  // Paged: a space with many sources owns more rules than one page holds.
  while (true) {
    const response = await rulesClient.findRules({
      filter: `metadata.tags: "${ENGINE_RULE_TAG}"`,
      page,
      perPage: FIND_PAGE_SIZE,
    });
    response.items.forEach((rule) => {
      const tag = rule.metadata.tags?.find((item) => item.startsWith(STRATEGY_TAG_PREFIX));
      const strategy = tag?.slice(STRATEGY_TAG_PREFIX.length);
      rules.set(
        rule.id,
        SIGNAL_STRATEGY_IDS.find((id) => id === strategy)
      );
    });
    if (response.items.length < FIND_PAGE_SIZE || rules.size >= response.total) {
      return rules;
    }
    page++;
  }
}

/**
 * Makes the engine's Alerting v2 rules match what its strategies need: one rule per strategy and
 * source, created with the request's credentials so Alerting v2 runs it with that user's API
 * key. Rules are only created or deleted, never edited: a changed query gets a new id, so a
 * half-applied reconciliation never leaves a rule with a mix of old and new settings.
 */
export async function reconcileRules({
  rulesClient,
  config,
  context,
  previous,
  logger,
}: {
  rulesClient: RulesClientApi;
  config: EngineConfig;
  context: RuleSpecContext;
  /** The last reconciliation, whose rules a strategy keeps when its definitions fail. */
  previous?: EngineRulesRecord;
  logger: Logger;
}): Promise<EngineRulesRecord> {
  const reconciledAt = new Date().toISOString();
  const ruleStrategies = SIGNAL_STRATEGY_IDS.filter((id) => STRATEGIES[id].desiredRules);
  const perStrategy = new Map<
    SignalStrategyId,
    { desired: DesiredRule[]; state: StrategyRulesState }
  >(
    await Promise.all(
      ruleStrategies.map(
        async (
          strategy
        ): Promise<[SignalStrategyId, { desired: DesiredRule[]; state: StrategyRulesState }]> => {
          const state: StrategyRulesState = {
            strategy,
            owned_rules: 0,
            watched_rules: 0,
            skipped_sources: [],
            errors: [],
          };
          if (config.strategies[strategy].mode === 'off') {
            return [strategy, { desired: [], state }];
          }
          try {
            const { rules, skipped } = await STRATEGIES[strategy].desiredRules!(context);
            return [strategy, { desired: rules, state: { ...state, skipped_sources: skipped } }];
          } catch (error) {
            return [
              strategy,
              { desired: [], state: { ...state, errors: [getErrorMessage(error)] } },
            ];
          }
        }
      )
    )
  );

  const desired = new Map(
    [...perStrategy.entries()].flatMap(([strategy, { desired: rules }]) =>
      rules.map((rule) => [rule.rule_id, { strategy, rule }] as const)
    )
  );
  // A strategy whose rule definitions could not be built keeps its existing rules.
  const failedStrategies = new Set(
    [...perStrategy.entries()]
      .filter(([, { state }]) => state.errors.length > 0)
      .map(([strategy]) => strategy)
  );
  const existingRules = await findOwnedRules(rulesClient);
  const existing = new Set(existingRules.keys());
  const toDelete = [...existingRules.entries()]
    .filter(([id, strategy]) => !desired.has(id) && !(strategy && failedStrategies.has(strategy)))
    .map(([id]) => id);
  const toCreate = [...desired.values()].filter(({ rule }) => !existing.has(rule.rule_id));
  const createdIds = new Set<string>();
  const errors: string[] = [];

  // Deleted first: a replacement rule has the same name, and names are unique in a space.
  const deleteResults = await Promise.all(
    chunk(toDelete, BULK_CHUNK).map((ids) => rulesClient.bulkDeleteRules({ ids }))
  );
  const deleteErrors = deleteResults.flatMap((result) => result.errors);
  deleteErrors.forEach((error) => errors.push(`Delete ${error.id}: ${error.error.message}`));

  for (const items of chunk(toCreate, BULK_CHUNK)) {
    // Sequential: Alerting v2 limits schedules per minute, and a failed chunk should not hide
    // which rules the earlier chunks created.
    try {
      const response = await rulesClient.bulkCreateRules({
        items: items.map(({ rule }) => ({ ...rule.data, id: rule.rule_id, enabled: true })),
      });
      response.items.forEach((rule) => createdIds.add(rule.id));
      response.errors.forEach((error) => {
        if (error.error.code === ALREADY_EXISTS) {
          createdIds.add(error.id);
          return;
        }
        const strategy = desired.get(error.id)?.strategy;
        const message = `Create ${error.id}: ${error.error.message}`;
        if (strategy) {
          perStrategy.get(strategy)?.state.errors.push(message);
        } else {
          errors.push(message);
        }
      });
    } catch (error) {
      errors.push(getErrorMessage(error));
    }
  }

  const owned: OwnedRule[] = [
    ...[...desired.values()]
      .filter(({ rule }) => existing.has(rule.rule_id) || createdIds.has(rule.rule_id))
      .map(({ strategy, rule }) => ({
        rule_id: rule.rule_id,
        strategy,
        source_id: rule.source_id,
        name: rule.data.metadata.name,
        meta: rule.meta,
      })),
    ...(previous?.owned ?? []).filter(
      (rule) => failedStrategies.has(rule.strategy) && existing.has(rule.rule_id)
    ),
  ];

  const deleted = toDelete.length - deleteErrors.length;
  if (createdIds.size > 0 || deleted > 0) {
    logger.info(
      `Detection engine rules in space ${context.spaceId}: ${createdIds.size} created, ${deleted} deleted, ${owned.length} owned`
    );
  }

  return {
    reconciled_at: reconciledAt,
    created: createdIds.size,
    deleted,
    owned,
    strategies: [...perStrategy.values()].map(({ state }) => ({
      ...state,
      owned_rules: owned.filter((rule) => rule.strategy === state.strategy).length,
      errors: failedStrategies.has(state.strategy)
        ? [...state.errors, 'Rule definitions could not be built; existing rules were kept.']
        : state.errors,
    })),
    error: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
  };
}
