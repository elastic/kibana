/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { groupBy } from 'lodash';
import type { DetectionSignalGenerator, GenerateResult, GeneratorContext } from '../types';
import { KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { getKnownFailureRuleId, getUnwatchableReason } from './known_failure_rule';
import { toReadings, type MeasuredKnownFailure } from './to_reading';

/**
 * Reads what the Known failures rules wrote in the window. A rule only measures: every run writes
 * one row with its knowledge indicator's newest per-minute counts, normal level and latest change
 * point. The generator finds which knowledge indicator each rule watches and hands all of the rule's
 * rows to the judgement, since consecutive runs cover different minutes.
 */
export class KnownFailuresGenerator implements DetectionSignalGenerator {
  public async generate(context: GeneratorContext): Promise<GenerateResult> {
    const measured = await readMeasuredFailures(context);
    const readings = measured.flatMap(toReadings);

    return { readings, notes: [], truncated: false };
  }
}

/**
 * 1. Joins the strategy's enabled rules with the knowledge indicators they watch.
 * 2. Reads the rows those rules wrote in the window, grouped by rule.
 */
async function readMeasuredFailures(context: GeneratorContext): Promise<MeasuredKnownFailure[]> {
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

  // The reader returns rows newest first, and grouping keeps that order within each rule.
  return Object.entries(groupBy(rows, ({ rule_id: ruleId }) => ruleId)).flatMap(
    ([ruleId, ruleRows]) => {
      const knowledgeIndicator = knowledgeIndicatorByRuleId.get(ruleId);
      return knowledgeIndicator ? [{ knowledgeIndicator, rows: ruleRows }] : [];
    }
  );
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
  const [managedRules, queries] = await Promise.all([
    rules.listManaged({ strategy: KNOWN_FAILURES_STRATEGY_ID }),
    knowledge.listQueries({ sourceIds: sources.map(({ id }) => id) }),
  ]);
  const enabledRuleIds = new Set(managedRules.filter(({ enabled }) => enabled).map(({ id }) => id));

  return new Map(
    queries
      .filter((link) => getUnwatchableReason(link) === undefined)
      .map((query): [string, QueryLink] => [
        getKnownFailureRuleId({ spaceId, query, cpsEnabled }),
        query,
      ])
      .filter(([ruleId]) => enabledRuleIds.has(ruleId))
  );
}
