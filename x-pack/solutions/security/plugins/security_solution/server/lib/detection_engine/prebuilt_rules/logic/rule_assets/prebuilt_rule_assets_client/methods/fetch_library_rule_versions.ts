/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { BasicRuleInfo } from '../../../basic_rule_info';
import { getPrebuiltRuleAssetsSearchNamespace } from '../utils';
import type { LibraryRelease } from './library_release_filter';
import { buildLibraryReleaseFilter, hasSyncedLibrary } from './library_release_filter';

const PAGE_SIZE = 5_000;
// Stops a runaway read. At 5,000 a page this is a million rules.
const MAX_PAGES = 200;

const FIELD = (name: string) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${name}`;

/**
 * The version of every rule the given libraries have now, read a page at a time so there is no limit on how
 * many rules a library can have. Used to install all the rules of a library.
 */
export async function fetchLibraryRuleVersions(
  savedObjectsClient: SavedObjectsClientContract,
  libraries: readonly LibraryRelease[]
): Promise<BasicRuleInfo[]> {
  if (!hasSyncedLibrary(libraries)) {
    return [];
  }

  const rules: BasicRuleInfo[] = [];
  let searchAfter: SortResults | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await savedObjectsClient.search<
      SavedObjectsRawDocSource & { [PREBUILT_RULE_ASSETS_SO_TYPE]: BasicRuleInfo }
    >({
      type: PREBUILT_RULE_ASSETS_SO_TYPE,
      namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
      query: {
        bool: {
          filter: [buildLibraryReleaseFilter(libraries)],
          must_not: { term: { [FIELD('deprecated')]: true } },
        },
      },
      sort: [{ [FIELD('library_id')]: 'asc' }, { [FIELD('rule_id')]: 'asc' }],
      _source: [FIELD('rule_id'), FIELD('version'), FIELD('type'), FIELD('library_id')],
      size: PAGE_SIZE,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const { hits } = result.hits;
    for (const hit of hits) {
      const hitSource = hit._source;
      invariant(hitSource, 'Expected hit source to be defined');
      const {
        rule_id: ruleId,
        version,
        type,
        library_id: libraryId,
      } = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
      rules.push({
        rule_id: ruleId,
        version,
        type,
        ...(libraryId ? { library_id: libraryId } : {}),
      });
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (hits.length < PAGE_SIZE || !lastSort) {
      return rules;
    }
    searchAfter = lastSort;
  }

  throw new Error('Too many rules to read');
}
