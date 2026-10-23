/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { getDynamicBlock } from './dynamic';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern } from './esql_syntax';
import { canonicalizeEsqlFilter } from './filters';
import type { IndexMode, QueryEngine, QueryPlan, ResolvedSource } from './types';
import { MAX_QUERY_PLANS } from './types';

// Time series indices first, so a split source lists its `TS` plan before its `FROM` plan.
const ENGINE_BY_MODE: ReadonlyArray<readonly [IndexMode, QueryEngine]> = [
  ['time_series', 'TS'],
  ['standard', 'FROM'],
];

/**
 * Turns the sources of a definition into validated query plans, with `resolved[i]` the concrete
 * indices the caller resolved for source `i`. Each source gives one plan per index mode it has,
 * `TS` before `FROM`, and none when it has no indices; a plan's filter is the canonical form of its
 * source's filter.
 */
export const planSources = (
  definition: EntityDefinitionWithoutId,
  resolved: ResolvedSource[]
): QueryPlan[] => {
  const { type } = definition;
  const { sources } = getDynamicBlock(definition);
  if (resolved.length !== sources.length) {
    throw new InventoryDefinitionError(
      `definition "${type}" has ${sources.length} sources but ${resolved.length} resolved sources were given`
    );
  }

  const plans = sources
    .flatMap(({ indexPattern, attributes = [] }, sourceIndex) => {
      const { indices } = resolved[sourceIndex];
      const groups = ENGINE_BY_MODE.map(([mode, engine]) => ({
        engine,
        names: [
          ...new Set(indices.filter((index) => index.mode === mode).map(({ name }) => name)),
        ].sort(),
      })).filter(({ names }) => names.length > 0);
      // A source whose indices share one mode is queried by its pattern; a split one by its indices.
      const queryTarget = groups.length > 1 ? 'indices' : 'pattern';
      return groups.map(
        ({ engine, names }): Omit<QueryPlan, 'index'> => ({
          sourceIndex,
          indexPattern,
          indices: names,
          queryTarget,
          attributes,
          engine,
        })
      );
    })
    .map((plan, index): QueryPlan => ({ index, ...plan }));

  if (plans.length > MAX_QUERY_PLANS) {
    throw new InventoryDefinitionError(
      `definition "${type}" expands to ${plans.length} query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  }

  // Checked in source order, so the first bad source is the one reported.
  const filters = sources.map(({ indexPattern, filter }) => {
    assertSafeIndexPattern(indexPattern);
    return filter === undefined
      ? undefined
      : canonicalizeEsqlFilter(filter, `source ${indexPattern} filter`);
  });

  // A plan carries the canonical form of its source's filter: parsed, checked and re-printed from
  // the syntax tree, so only that text ever reaches a query.
  return plans.map((plan): QueryPlan => {
    const filter = filters[plan.sourceIndex];
    return filter === undefined ? plan : { ...plan, filter };
  });
};
