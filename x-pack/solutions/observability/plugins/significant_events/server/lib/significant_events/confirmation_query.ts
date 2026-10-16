/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLAstItem, ESQLCommand } from '@elastic/esql/types';
import { canCompileMatchMetric } from './rules/can_compile_match_metric';

const isSource = (item: ESQLAstItem): item is Extract<ESQLAstItem, { type: 'source' }> =>
  !Array.isArray(item) && item.type === 'source';

export interface MatchQueryParts {
  /** The `FROM` target the grounding queries run on. */
  target: string;
  /** The stored `WHERE` commands, verbatim and in order. */
  predicates: string[];
}

/**
 * Splits a stored filter-only MATCH query into the view to query and its predicates. The target is
 * the stored one when it is already a `$.` view and otherwise the source's view. Returns nothing
 * for any other shape or when no view is known, so the agent builds the query from the skill.
 */
export const parseMatchQuery = ({
  esqlQuery,
  viewName,
}: {
  esqlQuery: string;
  viewName?: string;
}): MatchQueryParts | undefined => {
  if (!canCompileMatchMetric(esqlQuery)) return undefined;

  const text = esqlQuery.trim();
  const commands = Parser.parse(text).root.commands as ESQLCommand[];
  const [from, ...rest] = commands;
  const predicates = rest.map(({ location }) => text.slice(location.min, location.max + 1));
  if (predicates.length === 0) return undefined;

  const storedSources = from.args
    .filter(isSource)
    .map(({ location }) => text.slice(location.min, location.max + 1));
  const target = storedSources.some((source) => source.startsWith('$.'))
    ? storedSources.join(', ')
    : viewName;
  return target ? { target, predicates } : undefined;
};

/**
 * The grounding skill's executed form of a stored filter-only MATCH query: its predicate over a
 * bounded window, newest rows first, five at most.
 */
export const buildConfirmationQuery = (params: {
  esqlQuery: string;
  viewName?: string;
}): string | undefined => {
  const parts = parseMatchQuery(params);
  if (!parts) return undefined;
  return [
    `FROM ${parts.target}`,
    'WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
    ...parts.predicates,
    'SORT @timestamp DESC',
    'LIMIT 5',
  ].join(' | ');
};
