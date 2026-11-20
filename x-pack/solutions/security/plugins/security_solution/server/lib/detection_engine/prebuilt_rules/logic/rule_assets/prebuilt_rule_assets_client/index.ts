/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RULE_LIBRARY_DEFINITIONS } from '@kbn/security-rule-libraries';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { PrebuiltRuleAssetRecord } from '../../../model/rule_assets/prebuilt_rule_asset';
import type { RuleVersionSpecifier } from '../../rule_versions/rule_version_specifier';
import type { BasicRuleInfo } from '../../basic_rule_info';
import type { FetchLatestAssetsOptions } from './methods/fetch_latest_assets';
import { fetchLatestAssets } from './methods/fetch_latest_assets';
import { fetchLatestVersions } from './methods/fetch_latest_versions';
import { fetchRuleCountsByLibrary } from './methods/fetch_rule_counts_by_library';
import { fetchTagsByLibraries } from './methods/fetch_tags_by_libraries';
import type {
  FetchAssetsByVersionResult,
  FetchAssetsByVersionSearchParams,
} from './methods/fetch_assets_by_version';
import { fetchAssetsByVersion } from './methods/fetch_assets_by_version';
import { fetchTagsByVersion } from './methods/fetch_tags_by_version';
import type { DeprecatedPrebuiltRuleAsset } from '../../../model/rule_assets/deprecated_prebuilt_rule_asset';
import { fetchDeprecatedRules } from './methods/fetch_deprecated_rules';

export interface IPrebuiltRuleAssetsClient {
  fetchLatestAssets: (options?: FetchLatestAssetsOptions) => Promise<PrebuiltRuleAssetRecord[]>;

  fetchLatestVersions: (args?: {
    ruleIds?: string[];
    filter?: string;
    sort?: PrebuiltRuleAssetsSort;
    libraryIds?: string[];
  }) => Promise<BasicRuleInfo[]>;

  fetchAssetsByVersion(
    versions: RuleVersionSpecifier[],
    params?: FetchAssetsByVersionSearchParams
  ): Promise<FetchAssetsByVersionResult>;

  fetchTagsByVersion(versions: RuleVersionSpecifier[]): Promise<string[]>;

  fetchRuleCountsByLibrary(): Promise<Record<string, number>>;

  fetchTagsByLibraries(libraryIds: string[]): Promise<string[]>;

  fetchDeprecatedRules(ruleIds?: string[]): Promise<DeprecatedPrebuiltRuleAsset[]>;
}

export interface PrebuiltRuleAssetsClientOptions {
  ruleLibraryEnabled?: boolean;
}

const libraryIdsFor = (enabled?: boolean): string[] | undefined =>
  enabled ? RULE_LIBRARY_DEFINITIONS.map(({ id }) => id) : undefined;

export const createPrebuiltRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract,
  options?: PrebuiltRuleAssetsClientOptions
): IPrebuiltRuleAssetsClient => {
  const libraryIds = libraryIdsFor(options?.ruleLibraryEnabled);

  return {
    fetchLatestAssets: (fetchOptions?: FetchLatestAssetsOptions) => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestAssets', async () => {
        return fetchLatestAssets(savedObjectsClient, {
          size: fetchOptions?.size,
          libraryIds: fetchOptions?.libraryIds ?? libraryIds,
        });
      });
    },

    fetchLatestVersions: ({ ruleIds, sort, filter, libraryIds: libraryIdsArg } = {}): Promise<
      BasicRuleInfo[]
    > => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestVersions', async () => {
        return fetchLatestVersions(savedObjectsClient, {
          ruleIds,
          sort,
          filter,
          libraryIds: libraryIdsArg ?? libraryIds,
        });
      });
    },

    fetchAssetsByVersion: (
      versions: RuleVersionSpecifier[],
      params?: FetchAssetsByVersionSearchParams
    ): Promise<FetchAssetsByVersionResult> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchAssetsByVersion', async () => {
        return fetchAssetsByVersion(savedObjectsClient, versions, {
          ...params,
          libraryIds: params?.libraryIds ?? libraryIds,
        });
      });
    },

    fetchTagsByVersion: (versions: RuleVersionSpecifier[]): Promise<string[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchTagsByVersion', async () => {
        return fetchTagsByVersion(savedObjectsClient, versions);
      });
    },

    fetchRuleCountsByLibrary: (): Promise<Record<string, number>> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchRuleCountsByLibrary', async () => {
        return fetchRuleCountsByLibrary(savedObjectsClient);
      });
    },

    fetchTagsByLibraries: (ids: string[]): Promise<string[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchTagsByLibraries', async () => {
        return fetchTagsByLibraries(savedObjectsClient, ids);
      });
    },

    fetchDeprecatedRules: (ruleIds?: string[]): Promise<DeprecatedPrebuiltRuleAsset[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchDeprecatedRules', async () => {
        return fetchDeprecatedRules(savedObjectsClient, ruleIds, libraryIds);
      });
    },
  };
};
