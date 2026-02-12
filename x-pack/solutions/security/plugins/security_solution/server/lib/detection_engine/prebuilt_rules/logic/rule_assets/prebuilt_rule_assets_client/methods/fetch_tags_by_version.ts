/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { getPrebuiltRuleAssetSoId, getPrebuiltRuleAssetsSearchNamespace } from '../utils';
import { EXPECTED_MAX_TAGS } from '../../../../../rule_management/constants';

/**
 * Fetches unique tags from prebuilt rule assets for specified rule versions.
 *
 * @param savedObjectsClient - Saved Objects client
 * @param versions - An array of rule version specifiers, each containing a rule_id and version
 * @returns A promise that resolves to an array of unique tags, sorted alphabetically.
 */
export async function fetchTagsByVersion(
  savedObjectsClient: SavedObjectsClientContract,
  versions: RuleVersionSpecifier[]
): Promise<string[]> {
  const soIds = versions.map((version) =>
    getPrebuiltRuleAssetSoId(version.rule_id, version.version)
  );

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    { unique_tags: AggregationsTermsAggregateBase<{ key: string; doc_count: number }> }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    _source: false,
    size: 0,
    query: {
      terms: {
        _id: soIds,
      },
    },
    aggs: {
      unique_tags: {
        terms: {
          field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`,
          // "size" parameter is the maximum number of terms returned by the aggregation, default is 10.
          // Setting it to a large number to ensure we get all tags.
          size: EXPECTED_MAX_TAGS,
          order: { _key: 'asc' },
        },
      },
    },
  });

  const buckets = searchResult.aggregations?.unique_tags?.buckets || [];
  invariant(Array.isArray(buckets), 'fetchTagsByVersion: expected buckets to be an array');

  const tags = buckets.map((bucket) => bucket.key);
  return tags;
}
