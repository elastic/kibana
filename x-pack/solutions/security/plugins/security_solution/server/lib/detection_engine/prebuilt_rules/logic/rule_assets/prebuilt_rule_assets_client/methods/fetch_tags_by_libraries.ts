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
import type { LibraryRelease } from './library_release_filter';
import { buildLibraryReleaseFilter, hasSyncedLibrary } from './library_release_filter';

const MAX_TAGS = 1000;

/**
 * The tags used by the rules the given libraries have now, to offer them as a filter.
 */
export async function fetchTagsByLibraries(
  savedObjectsClient: SavedObjectsClientContract,
  libraries: readonly LibraryRelease[]
): Promise<string[]> {
  if (!hasSyncedLibrary(libraries)) {
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
        filter: [buildLibraryReleaseFilter(libraries)],
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
