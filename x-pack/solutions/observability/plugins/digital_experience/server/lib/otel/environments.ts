/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TermsAggregation } from '../helpers/aggregations';
import { bucketKeys } from '../helpers/aggregations';
import { withNotDefined } from '../helpers/environment';

/** The `environmentTerms` aggregations, one per environment field. */
export interface EnvironmentAggregations {
  environments: TermsAggregation;
  environmentNames: TermsAggregation;
}

/** The `byEnvironment` aggregations: every environment, and `TMetrics` in the selected one. */
export type ByEnvironmentAggregations<TMetrics> = EnvironmentAggregations & {
  environmentNotDefined: { doc_count: number };
  inEnvironment: TMetrics;
};

/** The environment names in the given aggregations, without duplicates. */
export const environmentsOf = (
  ...aggregations: Array<EnvironmentAggregations | undefined>
): string[] => [
  ...new Set(
    aggregations.flatMap((aggregation) => [
      ...bucketKeys(aggregation?.environments),
      ...bucketKeys(aggregation?.environmentNames),
    ])
  ),
];

/** The environments for the picker, "Not defined" included when some documents have none. */
export const pickerEnvironments = <TMetrics>(
  aggregations?: ByEnvironmentAggregations<TMetrics>
): string[] =>
  withNotDefined(environmentsOf(aggregations), aggregations?.environmentNotDefined.doc_count ?? 0);
