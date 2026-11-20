/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_LIBRARY_ID } from '@kbn/security-rule-libraries';
import type {
  BrowseRuleLibraryResponseBody,
  RuleLibraryRule,
  RuleLibraryRuleInstallState,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { PrebuiltRuleAssetsSort } from '../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { prepareKQLStringParam } from '../../../../../common/utils/kql';
import type { PrebuiltRuleAssetRecord } from '../model/rule_assets/prebuilt_rule_asset';
import { convertPrebuiltRuleAssetSearchTermToKQL } from './build_prebuilt_rule_installation_kql';
import type { IPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from './rule_assets/prebuilt_rule_assets_type';
import type { RuleSummary } from './rule_objects/prebuilt_rule_objects_client';

// Only what the library page needs, so a page of results never loads whole rule bodies.
const BROWSE_FIELDS = [
  'rule_id',
  'version',
  // Needed to match each hit back to the library it was requested from.
  'library_id',
  'name',
  'description',
  'severity',
  'risk_score',
  'tags',
  'related_integrations',
];

// Matches the rule name, or one of its tags.
export const buildBrowseSearchKql = (search: string | undefined): string | undefined => {
  const term = search?.trim();
  if (!term) {
    return undefined;
  }
  const tagsField = `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`;
  return `(${convertPrebuiltRuleAssetSearchTermToKQL(
    term
  )}) OR (${tagsField}: ${prepareKQLStringParam(term)})`;
};

// Matches the rules that have any of the tactics.
export const buildBrowseTacticsKql = (
  tactics: readonly string[] | undefined
): string | undefined => {
  if (!tactics?.length) {
    return undefined;
  }
  const tacticIds = tactics.map((tactic) => prepareKQLStringParam(tactic)).join(' or ');
  return `${PREBUILT_RULE_ASSETS_SO_TYPE}.threat.tactic.id: (${tacticIds})`;
};

// Matches the rules that have all of the tags, as the filter of the other rules tables does.
export const buildBrowseTagsKql = (tags: readonly string[] | undefined): string | undefined => {
  if (!tags?.length) {
    return undefined;
  }
  const tagValues = tags.map((tag) => prepareKQLStringParam(tag)).join(' AND ');
  return `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags: (${tagValues})`;
};

// The search, the tags and the tactics all have to match.
export const buildBrowseKql = ({
  search,
  tags,
  tactics,
}: {
  search?: string;
  tags?: readonly string[];
  tactics?: readonly string[];
}): string | undefined => {
  const parts = [
    buildBrowseSearchKql(search),
    buildBrowseTagsKql(tags),
    buildBrowseTacticsKql(tactics),
  ].flatMap((kql) => (kql ? [`(${kql})`] : []));
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};

export interface RuleLibraryInstallInfo {
  install_state: RuleLibraryRuleInstallState;
  installed_from_library?: { id: string; title: string };
}

/**
 * Whether a rule of the given library is installed in this space. A space installs a rule_id from one library
 * only, so a rule installed from another library blocks this one. Installed rules without a library are
 * from the Elastic library.
 */
export const getRuleLibraryInstallInfo = (
  libraryId: string,
  installed: RuleSummary | undefined,
  libraryTitles: ReadonlyMap<string, string>
): RuleLibraryInstallInfo => {
  if (!installed) {
    return { install_state: 'installable' };
  }

  const installedLibraryId = installed.library_id ?? ELASTIC_LIBRARY_ID;
  if (installedLibraryId === libraryId) {
    return { install_state: 'installed' };
  }

  return {
    install_state: 'installed_from_other_library',
    installed_from_library: {
      id: installedLibraryId,
      title: libraryTitles.get(installedLibraryId) ?? installedLibraryId,
    },
  };
};

const toRule = (
  asset: PrebuiltRuleAssetRecord,
  installed: RuleSummary | undefined,
  libraryTitles: ReadonlyMap<string, string>
): RuleLibraryRule => {
  const libraryId = asset.library_id ?? ELASTIC_LIBRARY_ID;

  return {
    rule_id: asset.rule_id,
    version: asset.version,
    library_id: libraryId,
    name: asset.name,
    description: asset.description,
    severity: asset.severity,
    risk_score: asset.risk_score,
    tags: asset.tags ?? [],
    related_integrations: asset.related_integrations ?? [],
    ...getRuleLibraryInstallInfo(libraryId, installed, libraryTitles),
  };
};

interface BrowseRuleLibraryParams {
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  installedRuleVersions: readonly RuleSummary[];
  libraryTitles: ReadonlyMap<string, string>;
  libraryIds: string[];
  search?: string;
  tags?: readonly string[];
  tactics?: readonly string[];
  sort?: PrebuiltRuleAssetsSort;
  page: number;
  perPage: number;
}

/**
 * The latest version of every rule in the given libraries, with an install state for the current space.
 * Only rule ids are held for the whole result, full rule documents are read for the requested page only.
 */
export const browseRuleLibrary = async ({
  ruleAssetsClient,
  installedRuleVersions,
  libraryTitles,
  libraryIds,
  search,
  tags,
  tactics,
  sort,
  page,
  perPage,
}: BrowseRuleLibraryParams): Promise<BrowseRuleLibraryResponseBody> => {
  // An empty list would read as "no library filter" further down and return rules from every source.
  if (libraryIds.length === 0) {
    return { rules: [], total: 0, page, per_page: perPage };
  }

  const latestVersions = await ruleAssetsClient.fetchLatestVersions({
    libraryIds,
    filter: buildBrowseKql({ search, tags, tactics }),
    sort,
  });

  const pageVersions = latestVersions.slice((page - 1) * perPage, page * perPage);
  const { assets } = await ruleAssetsClient.fetchAssetsByVersion(pageVersions, {
    libraryIds,
    fields: BROWSE_FIELDS,
  });

  const installedByRuleId = new Map(installedRuleVersions.map((rule) => [rule.rule_id, rule]));

  return {
    rules: assets.map((asset) =>
      toRule(asset, installedByRuleId.get(asset.rule_id), libraryTitles)
    ),
    total: latestVersions.length,
    page,
    per_page: perPage,
  };
};
