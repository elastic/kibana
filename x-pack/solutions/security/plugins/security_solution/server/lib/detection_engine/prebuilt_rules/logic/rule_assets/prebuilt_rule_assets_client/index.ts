/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { PrebuiltRuleAsset } from '../../../model/rule_assets/prebuilt_rule_asset';
import type { RuleVersionSpecifier } from '../../rule_versions/rule_version_specifier';
import type { BasicRuleInfo } from '../../basic_rule_info';
import type { PrebuiltRuleAssetsFilter } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import { fetchLatestAssets } from './methods/fetch_latest_assets';
import { fetchLatestVersions } from './methods/fetch_latest_versions';
import { fetchAssetsByVersion } from './methods/fetch_assets_by_version';
import { fetchTagsByVersion } from './methods/fetch_tags_by_version';

export interface IPrebuiltRuleAssetsClient {
  fetchLatestAssets: () => Promise<PrebuiltRuleAsset[]>;

  fetchLatestVersions: (args?: {
    ruleIds?: string[];
    sort?: PrebuiltRuleAssetsSort;
    filter?: PrebuiltRuleAssetsFilter;
  }) => Promise<BasicRuleInfo[]>;

  fetchAssetsByVersion(versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]>;

  fetchTagsByVersion(versions: RuleVersionSpecifier[]): Promise<string[]>;
}

export const createPrebuiltRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): IPrebuiltRuleAssetsClient => {
  return {
    fetchLatestAssets: () => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestAssets', async () => {
        return fetchLatestAssets(savedObjectsClient);
      });
    },

    fetchLatestVersions: ({ ruleIds, sort, filter } = {}): Promise<BasicRuleInfo[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestVersions', async () => {
        return fetchLatestVersions(savedObjectsClient, { ruleIds, sort, filter });
      });
    },

    fetchAssetsByVersion: (versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchAssetsByVersion', async () => {
        return fetchAssetsByVersion(savedObjectsClient, versions);
      });
    },

    fetchTagsByVersion: (versions: RuleVersionSpecifier[]): Promise<string[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchTagsByVersion', async () => {
        return fetchTagsByVersion(savedObjectsClient, versions);
      });
    },
  };
};
