/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, Parser, type ComposerQuery } from '@elastic/esql';
import type { ESQLAstExpression, ESQLAstItem, ESQLCommand } from '@elastic/esql/types';
import { canCompileMatchMetric } from './rules/can_compile_match_metric';

export interface MatchQueryParts {
  /** The sources of the `FROM` the grounding queries run on. */
  sources: string[];
  /** The stored `WHERE` conditions, as AST nodes and in order. */
  predicates: ESQLAstExpression[];
}

const isSource = (item: ESQLAstItem): item is Extract<ESQLAstItem, { type: 'source' }> =>
  !Array.isArray(item) && item.type === 'source';

const isExpression = (item: ESQLAstItem | undefined): item is ESQLAstExpression =>
  item !== undefined && !Array.isArray(item);

/**
 * Splits a stored filter-only MATCH query into the sources to query and its conditions. The
 * sources are the stored ones when they are already `$.` views and otherwise the source's view.
 * Returns nothing for any other shape or when no view is known, so the agent builds the query
 * from the skill.
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
  const [from, ...rest] = Parser.parse(text).root.commands as ESQLCommand[];
  const predicates = rest.flatMap(({ args }) => (isExpression(args[0]) ? [args[0]] : []));
  if (predicates.length === 0 || predicates.length !== rest.length) return undefined;

  const storedSources = from.args
    .filter(isSource)
    .map(({ location }) => text.slice(location.min, location.max + 1));
  const sources = storedSources.some((source) => source.startsWith('$.'))
    ? storedSources
    : viewName
    ? [viewName]
    : [];
  return sources.length > 0 ? { sources, predicates } : undefined;
};

/** The skill's time bound: the window is bound to `?_tstart` / `?_tend` when the query runs. */
const windowBound = () => esql.exp`@timestamp >= ?_tstart AND @timestamp < ?_tend`;

/** `FROM <sources> | WHERE <window> | WHERE <each stored condition>`, ready for more commands. */
export const boundedMatchQuery = ({ sources, predicates }: MatchQueryParts): ComposerQuery =>
  predicates.reduce<ComposerQuery>(
    (query, predicate) => query.where`${predicate}`,
    esql.from(sources[0], ...sources.slice(1)).where`${windowBound()}`
  );

/**
 * The grounding skill's executed form of a stored filter-only MATCH query: its conditions over a
 * bounded window, newest rows first, five at most.
 */
export const buildConfirmationQuery = (params: {
  esqlQuery: string;
  viewName?: string;
}): string | undefined => {
  const parts = parseMatchQuery(params);
  return parts
    ? boundedMatchQuery(parts).pipe`SORT @timestamp DESC`.limit(5).print('basic')
    : undefined;
};
