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
import type { QueryEngine, QueryPlan } from './types';
import { MAX_QUERY_PLANS } from './types';

/**
 * Turns the sources of a definition into validated query plans, one per source in definition
 * order, with `engines[i]` the engine the caller resolved for source `i`.
 */
export const planSources = (
  definition: EntityDefinitionWithoutId,
  engines: QueryEngine[]
): QueryPlan[] => {
  const { type } = definition;
  const { sources } = getDynamicBlock(definition);
  if (engines.length !== sources.length) {
    throw new InventoryDefinitionError(
      `definition "${type}" has ${sources.length} sources but ${engines.length} engines were given`
    );
  }

  if (sources.length > MAX_QUERY_PLANS) {
    throw new InventoryDefinitionError(
      `definition "${type}" expands to ${sources.length} query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  }

  // A plan carries the canonical form of its source's filter: parsed, checked and re-printed from
  // the syntax tree, so only that text ever reaches a query.
  return sources.map(({ indexPattern, filter, attributes = [] }, sourceIndex): QueryPlan => {
    assertSafeIndexPattern(indexPattern);
    const canonical =
      filter !== undefined
        ? canonicalizeEsqlFilter(filter, `source ${indexPattern} filter`)
        : undefined;
    return {
      index: sourceIndex,
      sourceIndex,
      indexPattern,
      ...(canonical !== undefined ? { filter: canonical } : {}),
      attributes,
      engine: engines[sourceIndex],
    };
  });
};
