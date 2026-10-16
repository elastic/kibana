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

/**
 * The grounding skill's executed form of a stored filter-only MATCH query: its predicate over a
 * bounded window, newest rows first, five at most. The `FROM` target is the stored one when it is
 * already a `$.` view and otherwise the source's view. Returns nothing for any other shape, so the
 * agent falls back to building the query from the skill.
 */
export const buildConfirmationQuery = ({
  esqlQuery,
  viewName,
}: {
  esqlQuery: string;
  viewName?: string;
}): string | undefined => {
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
  if (!target) return undefined;

  return [
    `FROM ${target}`,
    'WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
    ...predicates,
    'SORT @timestamp DESC',
    'LIMIT 5',
  ].join(' | ');
};
