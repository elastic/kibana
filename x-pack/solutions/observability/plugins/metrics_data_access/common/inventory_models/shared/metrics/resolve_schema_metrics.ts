/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsBySchema, MetricDefinition } from '../../types';

export function resolveSchemaMetrics<TMetricDefinition extends MetricDefinition>({
  schema,
  metricDefinitions,
}: {
  metricDefinitions: MetricsBySchema<TMetricDefinition>;
  schema: 'ecs' | 'semconv';
}): TMetricDefinition {
  switch (schema) {
    case 'ecs': {
      return metricDefinitions.ecs;
    }
    case 'semconv': {
      return metricDefinitions.semconv;
    }
    default: {
      throw new Error(`Unsupported schema: ${schema}`);
    }
  }
}
export function getAggregation<TMetricDefinition extends MetricDefinition>(
  catalog: TMetricDefinition
) {
  return function <TAggKey extends string>(aggregation: TAggKey): TMetricDefinition[TAggKey] {
    if (!(aggregation in catalog)) {
      throw new Error(`Aggregation "${aggregation}" not found in metrics catalog.`);
    }

    return catalog[aggregation];
  };
}
