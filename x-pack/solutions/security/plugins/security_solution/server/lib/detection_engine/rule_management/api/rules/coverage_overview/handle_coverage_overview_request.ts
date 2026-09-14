/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';
import type {
  CoverageOverviewRequestBody,
  CoverageOverviewResponse,
} from '../../../../../../../common/api/detection_engine';
import {
  CoverageOverviewRuleSource,
  CoverageOverviewRuleActivity,
} from '../../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../../rule_schema';
import { findRules } from '../../../logic/search/find_rules';
import { iterateMitreThreatEntities } from '../../../../../../../common/detection_engine/mitre/iterate_mitre_threat_entities';
import {
  findInvalidMitreIds,
  buildValidMitreIdsFromBuckets,
} from '../../../../../../../common/detection_engine/mitre/find_invalid_mitre_ids';
import type { ValidMitreIdSets } from '../../../../../../../common/detection_engine/mitre/find_invalid_mitre_ids';

type CoverageOverviewRuleParams = Pick<RuleParams, 'threat'>;

interface CoverageOverviewRouteDependencies {
  rulesClient: RulesClient;
  /** Resolved managed MITRE data client. Absent when xpack.mitreAttack.managedSourceEnabled is off. */
  mitreDataClient?: MitreAttackDataClient;
}

interface HandleCoverageOverviewRequestArgs {
  params: CoverageOverviewRequestBody;
  deps: CoverageOverviewRouteDependencies;
}

/** Resolves the set of valid MITRE IDs from the managed client when available, else the static blob. */
const buildValidMitreIds = async (
  mitreDataClient: MitreAttackDataClient | undefined
): Promise<ValidMitreIdSets> => {
  if (mitreDataClient) {
    return buildValidMitreIdsFromBuckets(await mitreDataClient.list());
  }

  // Fallback: serves the bundled legacy blob when xpack.mitreAttack.managedSourceEnabled is off.
  // Remove once the managed source is the default and the blob is deleted.
  const { tactics, techniques, subtechniques } = await import(
    '../../../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
  const { transformLegacyMitreData } = await import(
    '../../../../../../../common/detection_engine/mitre/mitre_data_adapter'
  );
  return buildValidMitreIdsFromBuckets(
    transformLegacyMitreData({ tactics, techniques, subtechniques })
  );
};

export async function handleCoverageOverviewRequest({
  params: { filter },
  deps: { rulesClient, mitreDataClient },
}: HandleCoverageOverviewRequestArgs): Promise<CoverageOverviewResponse> {
  const activitySet = new Set(filter?.activity);
  const kqlFilter = convertRulesFilterToKQL({
    filter: filter?.search_term,
    showCustomRules: filter?.source?.includes(CoverageOverviewRuleSource.Custom) ?? false,
    showElasticRules: filter?.source?.includes(CoverageOverviewRuleSource.Prebuilt) ?? false,
    enabled: getIsEnabledFilter(activitySet),
  });

  // rulesClient.find uses ES Search API to fetch the rules. It has some limitations when the number of rules exceeds
  // index.max_result_window (set to 10K by default) Kibana fails. A proper way to handle it is via ES PIT API.
  // This way the endpoint handles max 10K rules for now while support for the higher number of rules will be addressed
  // in https://github.com/elastic/kibana/issues/160698
  const rules = await findRules({
    rulesClient,
    filter: kqlFilter,
    fields: ['name', 'enabled', 'params.threat'],
    page: 1,
    perPage: 10000,
    sortField: undefined,
    sortOrder: undefined,
  });

  const validIds = await buildValidMitreIds(mitreDataClient);

  return rules.data.reduce((acc, rule) => appendRuleToResponse(acc, rule, validIds), {
    coverage: {},
    unmapped_rule_ids: [],
    rules_data: {},
    invalid_mitre_ids: {},
  } as CoverageOverviewResponse);
}

function getIsEnabledFilter(activitySet: Set<CoverageOverviewRuleActivity>): boolean | undefined {
  const bothSpecified =
    activitySet.has(CoverageOverviewRuleActivity.Enabled) &&
    activitySet.has(CoverageOverviewRuleActivity.Disabled);
  const noneSpecified =
    !activitySet.has(CoverageOverviewRuleActivity.Enabled) &&
    !activitySet.has(CoverageOverviewRuleActivity.Disabled);

  return bothSpecified || noneSpecified
    ? undefined
    : activitySet.has(CoverageOverviewRuleActivity.Enabled);
}

function appendRuleToResponse(
  response: CoverageOverviewResponse,
  rule: SanitizedRule<CoverageOverviewRuleParams>,
  validIds: ValidMitreIdSets
): CoverageOverviewResponse {
  const categories = extractRuleMitreCategories(rule);

  for (const category of categories) {
    if (!response.coverage[category]) {
      response.coverage[category] = [rule.id];
    } else {
      response.coverage[category].push(rule.id);
    }
  }

  if (categories.length === 0) {
    response.unmapped_rule_ids.push(rule.id);
  }

  const invalidMitreIds = findInvalidMitreIds(rule.params.threat, validIds);
  if (invalidMitreIds.length > 0) {
    response.invalid_mitre_ids[rule.id] = invalidMitreIds;
  }

  response.rules_data[rule.id] = {
    name: rule.name,
    activity: rule.enabled
      ? CoverageOverviewRuleActivity.Enabled
      : CoverageOverviewRuleActivity.Disabled,
  };

  return response;
}

/**
 * Extracts a deduplicated list of MITRE ATT&CK™ tactic, technique, and subtechnique IDs
 * referenced by the rule's threat mappings.
 */
function extractRuleMitreCategories(rule: SanitizedRule<CoverageOverviewRuleParams>): string[] {
  // dedupe in case data isn't valid in ES
  const categories = new Set<string>();
  for (const { id } of iterateMitreThreatEntities(rule.params.threat)) {
    categories.add(id);
  }
  return Array.from(categories);
}
