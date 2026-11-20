/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsMultiBucketAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';

const MAX_LIBRARIES = 1000;
// Highest value Elasticsearch honours for the cardinality aggregation, so counts stay exact up to 40k rules.
const CARDINALITY_PRECISION_THRESHOLD = 40000;

/**
 * Counts distinct, non-deprecated rule_ids per library_id. Libraries keep every version of a rule, so
 * counting documents would overstate the number of rules. A deprecated rule is left out whole, including
 * the older versions that are not themselves marked as deprecated.
 */
export async function fetchRuleCountsByLibrary(
  savedObjectsClient: SavedObjectsClientContract
): Promise<Record<string, number>> {
  const result = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    {
      libraries: AggregationsMultiBucketAggregateBase<{
        key: string;
        rules: { value: number };
        deprecated: { rules: { value: number } };
      }>;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    _source: false,
    size: 0,
    aggs: {
      libraries: {
        terms: { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`, size: MAX_LIBRARIES },
        aggs: {
          rules: {
            cardinality: {
              field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
              precision_threshold: CARDINALITY_PRECISION_THRESHOLD,
            },
          },
          deprecated: {
            filter: { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true } },
            aggs: {
              rules: {
                cardinality: {
                  field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
                  precision_threshold: CARDINALITY_PRECISION_THRESHOLD,
                },
              },
            },
          },
        },
      },
    },
  });

  const buckets = result.aggregations?.libraries?.buckets;
  invariant(Array.isArray(buckets), 'fetchRuleCountsByLibrary: expected buckets to be an array');

  return Object.fromEntries(
    buckets.map(({ key, rules, deprecated }) => [key, rules.value - deprecated.rules.value])
  );
}
