/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AggregationsAggregate,
  AggregationsCardinalityAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

// type guard for checking if the Aggregation for a given field is a Cardinality
// Agregate with valid value
export const isAggCardinalityAggregate = <T extends string>(
  aggregation: Record<string, AggregationsAggregate> | undefined,
  field: T
): aggregation is Record<T, AggregationsCardinalityAggregate> => {
  return (aggregation?.[field] as AggregationsCardinalityAggregate)?.value !== undefined;
};
