/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { groupBy } from 'lodash';
import { MAX_ROWS } from '../../rules/managed_rule_reader';
import type { GeneratorContext } from '../types';
import { KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { getKnownFailureRuleId, getUnwatchableReason } from './known_failure_rule';
import { decodeKnownFailureRow, type KnownFailureMeasurement } from './known_failure_row';

/** The runs of one Known failures rule in the window, decoded, with the indicator it watches. */
export interface MeasuredKnownFailure {
  knowledgeIndicator: QueryLink;
  /** Newest run first. */
  measurements: KnownFailureMeasurement[];
}

/**
 * Each watched knowledge indicator with its Known failures rule's measurements in the window,
 * newest first, the notes on what could not be read, and whether the reader hit its cap. A rule
 * without a row ran no query in the window, which is noted, not read as a quiet indicator.
 */
export async function readMeasuredFailures(context: GeneratorContext): Promise<{
  measured: MeasuredKnownFailure[];
  notes: string[];
  truncated: boolean;
}> {
  const { spaceId, window, rules, abortSignal } = context;

  // 1. Joins the strategy's enabled rules with the knowledge indicators they watch.
  const { knowledgeIndicatorByRuleId, createdAtByRuleId, unwatched } =
    await readWatchedKnowledgeIndicators(context);
  const notes = unwatched.map(
    ({ query, isDisabled }) =>
      `knowledge indicator [${query.query.id}] has ${
        isDisabled ? 'a disabled' : 'no'
      } Known failures rule, so it is not watched`
  );
  if (knowledgeIndicatorByRuleId.size === 0) {
    return { measured: [], notes, truncated: false };
  }

  // 2. Reads the rows those rules wrote in the window, grouped by rule.
  const rows = await rules.readRows({
    spaceId,
    ruleIds: [...knowledgeIndicatorByRuleId.keys()],
    from: window.from,
    to: window.to,
    abortSignal,
  });
  // The reader returns rows newest first, and grouping keeps that order within each rule.
  const rowsByRuleId = groupBy(rows, ({ rule_id: ruleId }) => ruleId);

  // 3. Decodes each rule's rows; a row the rule query could not have written is noted and left out.
  const measured = [...knowledgeIndicatorByRuleId].flatMap(([ruleId, knowledgeIndicator]) => {
    const ruleRows = rowsByRuleId[ruleId] ?? [];
    if (ruleRows.length === 0) {
      // A rule created during the window, just reconciled, has had no chance to run yet.
      if ((createdAtByRuleId.get(ruleId) ?? 0) >= window.from) {
        return [];
      }
      notes.push(
        `rule [${ruleId}] of knowledge indicator [${knowledgeIndicator.query.id}] wrote no row in the window, so it may not be running`
      );
      return [];
    }
    const measurements = ruleRows.flatMap((row) => decodeKnownFailureRow(row) ?? []);
    if (measurements.length < ruleRows.length) {
      notes.push(`rule [${ruleId}] wrote a row without the Known failures columns`);
    }
    return measurements.length > 0 ? [{ knowledgeIndicator, measurements }] : [];
  });

  // The reader stops at its cap and leaves the window's oldest rows out.
  return { measured, notes, truncated: rows.length >= MAX_ROWS };
}

/**
 * The knowledge indicator each enabled rule watches, by rule id, joined on the id the reconciler
 * gives the indicator's rule, and when each rule was created. Only the tick's enabled sources are
 * read. A countable indicator without an enabled rule is returned apart, so it is noted instead of
 * silently going unwatched: its rule failed to be created, was turned off, or has another id.
 */
async function readWatchedKnowledgeIndicators({
  spaceId,
  sources,
  knowledge,
  rules,
  cpsEnabled,
}: GeneratorContext): Promise<{
  knowledgeIndicatorByRuleId: Map<string, QueryLink>;
  createdAtByRuleId: Map<string, number>;
  unwatched: Array<{ query: QueryLink; isDisabled: boolean }>;
}> {
  const [managedRules, queries] = await Promise.all([
    rules.listManaged({ strategy: KNOWN_FAILURES_STRATEGY_ID }),
    knowledge.listQueries({ sourceIds: sources.map(({ id }) => id) }),
  ]);
  const createdAtByRuleId = new Map(
    managedRules
      .filter(({ enabled }) => enabled)
      .map(({ id, created_at: createdAt }): [string, number] => [id, Date.parse(createdAt)])
  );

  const disabledRuleIds = new Set(
    managedRules.filter(({ enabled }) => !enabled).map(({ id }) => id)
  );

  const countable = queries
    .filter((link) => getUnwatchableReason(link) === undefined)
    .map((query) => ({ query, ruleId: getKnownFailureRuleId({ spaceId, query, cpsEnabled }) }));
  return {
    knowledgeIndicatorByRuleId: new Map(
      countable
        .filter(({ ruleId }) => createdAtByRuleId.has(ruleId))
        .map(({ query, ruleId }): [string, QueryLink] => [ruleId, query])
    ),
    createdAtByRuleId,
    unwatched: countable
      .filter(({ ruleId }) => !createdAtByRuleId.has(ruleId))
      .map(({ query, ruleId }) => ({ query, isDisabled: disabledRuleIds.has(ruleId) })),
  };
}
