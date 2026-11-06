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
import type { QueryEngine, QueryPlan, SourceProbe } from './types';
import { MAX_QUERY_PLANS } from './types';

/**
 * Turns the sources of a definition into validated query plans, with `probes[i]` the probe result
 * for source `i`. Every source gives a `FROM` plan, preceded by a `TS` plan when its probe found a
 * readable time-series index; a plan's filter is the canonical form of its source's filter.
 */
export const planSources = (
  definition: EntityDefinitionWithoutId,
  probes: SourceProbe[]
): QueryPlan[] => {
  const { type } = definition;
  const { sources } = getDynamicBlock(definition);
  if (probes.length !== sources.length) {
    throw new InventoryDefinitionError(
      `definition "${type}" has ${sources.length} sources but ${probes.length} probes were given`
    );
  }

  const plans = sources
    .flatMap(({ indexPattern, attributes = [] }, sourceIndex) => {
      // `TS` reads only time-series indices and `FROM` excludes them, so together they cover the
      // pattern once; without a readable time-series index the `TS` query would fail to verify.
      const engines: QueryEngine[] = probes[sourceIndex].hasTimeSeries ? ['TS', 'FROM'] : ['FROM'];
      return engines.map(
        (engine): Omit<QueryPlan, 'index'> => ({ sourceIndex, indexPattern, attributes, engine })
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
