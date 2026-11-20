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

const MAX_TAGS = 1000;

/**
 * The tags used by the rules of the given libraries, to offer them as a filter. Older versions of a rule are
 * included, so a tag that only an old version has can be listed.
 */
export async function fetchTagsByLibraries(
  savedObjectsClient: SavedObjectsClientContract,
  libraryIds: string[]
): Promise<string[]> {
  if (libraryIds.length === 0) {
    return [];
  }

  const result = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    { tags: AggregationsMultiBucketAggregateBase<{ key: string }> }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    _source: false,
    size: 0,
    query: {
      bool: {
        filter: [{ terms: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`]: libraryIds } }],
        must_not: { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true } },
      },
    },
    aggs: {
      tags: { terms: { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`, size: MAX_TAGS } },
    },
  });

  const buckets = result.aggregations?.tags?.buckets;
  invariant(Array.isArray(buckets), 'fetchTagsByLibraries: expected buckets to be an array');

  return buckets.map(({ key }) => key);
}
