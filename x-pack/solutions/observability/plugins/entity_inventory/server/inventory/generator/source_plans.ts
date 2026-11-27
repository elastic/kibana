/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { QueryEngine } from '../../../common';
import { getDynamicBlock } from './dynamic';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern } from './esql_syntax';
import { canonicalizeEsqlFilter } from './filters';
import {
  combineSourceFilterWithMetricFilter,
  groupSourceMetricsByFilterForPlans,
} from './metrics/metrics';
import type { QueryPlan, SourceProbe } from './types';
import { MAX_QUERY_PLANS } from './types';

/**
 * Turns the sources of a definition into validated query plans, with `probes[i]` the probe result
 * for source `i`. Each source expands by metric-filter group, then by engine (`TS` when the probe
 * found time-series indices, always `FROM`). Attributes ride on every group of the source.
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

  // Checked in source order, so the first bad source is the one reported.
  const canonicalSourceFilters = sources.map(({ indexPattern, filter }) => {
    assertSafeIndexPattern(indexPattern);
    return filter === undefined
      ? undefined
      : canonicalizeEsqlFilter(filter, `source ${indexPattern} filter`);
  });

  const plans = sources
    .flatMap(({ indexPattern, attributes = [], metrics = [] }, sourceIndex) => {
      const engines: QueryEngine[] = probes[sourceIndex].hasTimeSeries ? ['TS', 'FROM'] : ['FROM'];
      const metricFilterGroups = groupSourceMetricsByFilterForPlans(metrics, indexPattern);
      const sourceFilter = canonicalSourceFilters[sourceIndex];
      return metricFilterGroups.flatMap(({ canonicalMetricFilter, metrics: metricsInGroup }) => {
        const planFilter = combineSourceFilterWithMetricFilter(sourceFilter, canonicalMetricFilter);
        return engines.map(
          (engine): Omit<QueryPlan, 'index'> => ({
            sourceIndex,
            indexPattern,
            attributes,
            metrics: metricsInGroup,
            engine,
            ...(planFilter !== undefined ? { filter: planFilter } : {}),
          })
        );
      });
    })
    .map((plan, index): QueryPlan => ({ index, ...plan }));

  if (plans.length > MAX_QUERY_PLANS) {
    throw new InventoryDefinitionError(
      `definition "${type}" expands to ${plans.length} query plans; at most ${MAX_QUERY_PLANS} are allowed`
    );
  }

  return plans;
};
