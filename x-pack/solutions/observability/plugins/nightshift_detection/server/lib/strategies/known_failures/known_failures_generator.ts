/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { sortBy } from 'lodash';
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
 * 1. Joins the strategy's enabled rules with the knowledge indicators they watch.
 * 2. Reads the rows those rules wrote in the window, and keeps each rule's latest.
 */
async function readActiveFailures(context: GeneratorContext): Promise<ActiveKnownFailure[]> {
  const { spaceId, window, rules, abortSignal } = context;

  // 1.
  const knowledgeIndicatorByRuleId = await readWatchedKnowledgeIndicators(context);

  // 2.
  const rows = await rules.readRows({
    spaceId,
    ruleIds: [...knowledgeIndicatorByRuleId.keys()],
    from: window.from,
    to: window.to,
    abortSignal,
  });

  return [...getLatestRowByRuleId(rows)].flatMap(([ruleId, row]) => {
    const knowledgeIndicator = knowledgeIndicatorByRuleId.get(ruleId);
    return knowledgeIndicator ? [{ knowledgeIndicator, row }] : [];
  });
}

/**
 * The knowledge indicator each enabled rule watches, by rule id, joined on the id the reconciler
 * gives the indicator's rule. Only the tick's enabled sources are read. A disabled rule, or an
 * indicator without a rule, gives nothing.
 */
async function readWatchedKnowledgeIndicators({
  spaceId,
  sources,
  knowledge,
  rules,
  cpsEnabled,
}: GeneratorContext): Promise<Map<string, QueryLink>> {
  const [managedRules, links] = await Promise.all([
    rules.listManaged({ strategy: KNOWN_FAILURES_STRATEGY_ID }),
    knowledge.listQueries({ sourceIds: sources.map(({ id }) => id) }),
  ]);
  const enabledRuleIds = new Set(managedRules.filter(({ enabled }) => enabled).map(({ id }) => id));

  // Two indicators with the same query share a rule id; sorted by id, the same one always wins.
  return new Map(
    sortBy(links, ({ query }) => query.id)
      .filter(({ query }) => getUnwatchableReason(query) === undefined)
      .map((link): [string, QueryLink] => [
        getKnownFailureRuleId({ spaceId, link, cpsEnabled }),
        link,
      ])
      .filter(([ruleId]) => enabledRuleIds.has(ruleId))
  );
}

/** Each rule's latest row; the rows come newest first, so a rule's first row is its latest. */
function getLatestRowByRuleId(rows: RuleRow[]): Map<string, RuleRow> {
  const latestRowByRuleId = new Map<string, RuleRow>();
  rows.forEach((row) => {
    if (!latestRowByRuleId.has(row.rule_id)) {
      latestRowByRuleId.set(row.rule_id, row);
    }
  });
  return latestRowByRuleId;
}
