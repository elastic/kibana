/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryKnowledgeIndicator } from '@kbn/significant-events-plugin/server';
import type { RuleRow } from '../../rules/managed_rule_reader';
import type { DetectionSignalGenerator, GenerateResult, GeneratorContext } from '../types';
import { KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { getKnownFailureRuleId, getUnwatchableReason } from './known_failure_rule';
import { toReading, type ActiveKnownFailure } from './to_reading';

/**
 * Reads what the Known failures rules wrote in the window. The rules do the detection: a rule writes
 * a row only while its knowledge indicator's count is up, so every rule with a row is an active
 * failure. The generator finds which knowledge indicator each rule watches and keeps the rule's
 * latest row.
 */
export class KnownFailuresGenerator implements DetectionSignalGenerator {
  public async generate(context: GeneratorContext): Promise<GenerateResult> {
    const active = await readActiveFailures(context);
    const readings = active.flatMap((failure) => toReading(failure) ?? []);

    return { readings, notes: [], truncated: false };
  }
}

/**
 * 1. Lists the strategy's enabled rules and the space's knowledge indicators, and joins them on the
 *    rule id the reconciler gives each indicator. A disabled rule, or an indicator without a rule,
 *    gives nothing.
 * 2. Reads the rows those rules wrote for runs scheduled in the window, and keeps each rule's latest.
 */
async function readActiveFailures({
  spaceId,
  window,
  knowledge,
  rules,
  cpsEnabled,
  abortSignal,
}: GeneratorContext): Promise<ActiveKnownFailure[]> {
  // 1.
  const [managedRules, knowledgeIndicators] = await Promise.all([
    rules.listManaged({ strategy: KNOWN_FAILURES_STRATEGY_ID }),
    knowledge.listQueryKnowledgeIndicators(),
  ]);
  const enabledRuleIds = new Set(managedRules.filter(({ enabled }) => enabled).map(({ id }) => id));
  const knowledgeIndicatorByRuleId = new Map<string, QueryKnowledgeIndicator>(
    knowledgeIndicators
      .filter((knowledgeIndicator) => getUnwatchableReason(knowledgeIndicator) === undefined)
      .map((knowledgeIndicator): [string, QueryKnowledgeIndicator] => [
        getKnownFailureRuleId({ spaceId, knowledgeIndicator, cpsEnabled }),
        knowledgeIndicator,
      ])
      .filter(([ruleId]) => enabledRuleIds.has(ruleId))
  );

  // 2.
  const rows = await rules.readRows({
    spaceId,
    ruleIds: [...knowledgeIndicatorByRuleId.keys()],
    from: window.from,
    to: window.to,
    abortSignal,
  });
  const latestRowByRuleId = new Map<string, RuleRow>();
  // Newest first, so the first row of a rule is its latest.
  rows.forEach((row) => {
    if (!latestRowByRuleId.has(row.rule_id)) {
      latestRowByRuleId.set(row.rule_id, row);
    }
  });

  return [...latestRowByRuleId].flatMap(([ruleId, row]) => {
    const knowledgeIndicator = knowledgeIndicatorByRuleId.get(ruleId);
    return knowledgeIndicator ? [{ knowledgeIndicator, row }] : [];
  });
}
