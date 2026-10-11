/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsClientContract,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../../lib/detection_engine/prebuilt_rules/logic/rule_versions/rule_version_specifier';

export interface GetInstalledPrebuiltRuleAssetsOptions {
  versions: RuleVersionSpecifier[];
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

type PrebuiltRuleAssetIdentityDoc = SavedObjectsRawDocSource & {
  [PREBUILT_RULE_ASSETS_SO_TYPE]: RuleVersionSpecifier;
};

/**
 * Returns the subset of the given prebuilt rule versions that have a non-deprecated rule asset installed.
 *
 * Fetches identity attributes only, without validating the asset content, so a malformed asset
 * cannot break telemetry collection.
 */
export const getInstalledPrebuiltRuleAssets = async ({
  versions,
  logger,
  savedObjectsClient,
}: GetInstalledPrebuiltRuleAssetsOptions): Promise<RuleVersionSpecifier[]> => {
  if (versions.length === 0) {
    // without the early return an empty `terms` clause would match nothing but still hit ES
    return [];
  }

  const soIds = versions.map(getPrebuiltRuleAssetSoId);

  const response = await savedObjectsClient.search<PrebuiltRuleAssetIdentityDoc>({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    size: soIds.length,
    _source: {
      includes: [
        `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
        `${PREBUILT_RULE_ASSETS_SO_TYPE}.version`,
      ],
    },
    query: {
      bool: {
        must: { terms: { _id: soIds } },
        must_not: { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true } },
      },
    },
  });

  return response.hits.hits.flatMap((hit): RuleVersionSpecifier[] => {
    const attributes = hit._source?.[PREBUILT_RULE_ASSETS_SO_TYPE];

    if (attributes == null) {
      logger.debug(`Prebuilt rule asset "${hit._id}" has no source, skipping`);
      return [];
    }

    return [{ rule_id: attributes.rule_id, version: attributes.version }];
  });
};

/**
 * Mirrors the id format produced by `getPrebuiltRuleAssetSoId` in the prebuilt rule assets client.
 */
const getPrebuiltRuleAssetSoId = ({ rule_id: ruleId, version }: RuleVersionSpecifier): string =>
  `${PREBUILT_RULE_ASSETS_SO_TYPE}:${ruleId}_${version}`;
