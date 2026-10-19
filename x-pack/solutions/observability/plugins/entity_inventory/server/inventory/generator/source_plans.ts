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
import { assertEsqlFilter } from './filters';
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

  const plans = sources.map(
    ({ indexPattern, filter, attributes = [] }, sourceIndex): QueryPlan => ({
      index: sourceIndex,
      sourceIndex,
      indexPattern,
      ...(filter !== undefined ? { filter } : {}),
      attributes,
      engine: engines[sourceIndex],
    })
  );

  if (plans.length > MAX_QUERY_PLANS) {
    throw new InventoryDefinitionError(
      `definition "${type}" expands to ${plans.length} query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  }

  plans.forEach(({ indexPattern, filter }) => {
    assertSafeIndexPattern(indexPattern);
    if (filter !== undefined) {
      assertEsqlFilter(filter, `source ${indexPattern} filter`);
    }
  });

  return plans;
};
