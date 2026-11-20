/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsFiltersAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { LibraryRelease } from './library_release_filter';
import { buildLibraryReleaseFilter, hasSyncedLibrary } from './library_release_filter';

/**
 * Counts the rules each library has now, without the deprecated ones unless asked to include them. The count is
 * exact, and a library that has not been synced has none.
 */
export async function fetchRuleCountsByLibrary(
  savedObjectsClient: SavedObjectsClientContract,
  libraries: readonly LibraryRelease[],
  { includeDeprecated = false }: { includeDeprecated?: boolean } = {}
): Promise<Record<string, number>> {
  if (!hasSyncedLibrary(libraries)) {
    return {};
  }

  const syncedLibraries = libraries.filter(({ version }) => Boolean(version));
  const result = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    { libraries: AggregationsFiltersAggregate }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    _source: false,
    size: 0,
    query: {
      bool: includeDeprecated
        ? {}
        : { must_not: { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true } } },
    },
    aggs: {
      libraries: {
        filters: {
          filters: Object.fromEntries(
            syncedLibraries.map((library) => [library.id, buildLibraryReleaseFilter([library])])
          ),
        },
      },
    },
  });

  const buckets = result.aggregations?.libraries?.buckets;
  invariant(
    buckets && !Array.isArray(buckets),
    'fetchRuleCountsByLibrary: expected buckets to be an object'
  );

  return Object.fromEntries(
    Object.entries(buckets).map(([id, { doc_count: count }]) => [id, count])
  );
}
