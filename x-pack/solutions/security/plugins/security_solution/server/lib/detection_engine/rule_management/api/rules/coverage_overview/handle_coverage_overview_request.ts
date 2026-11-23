/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import { isAtlasEntityId } from '@kbn/security-mitre-attack-common';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
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
  findInvalidMitreIdsByFramework,
  buildValidMitreIdsFromBuckets,
} from '../../../../../../../common/detection_engine/mitre/find_invalid_mitre_ids';
import type { ValidMitreIdSetsByFramework } from '../../../../../../../common/detection_engine/mitre/find_invalid_mitre_ids';
import { resolveMitreBucketsByFramework } from '../../../../mitre/resolve_mitre_buckets';

type CoverageOverviewRuleParams = Pick<RuleParams, 'threat'>;

interface CoverageOverviewRouteDependencies {
  rulesClient: RulesClient;
  /** Resolved managed MITRE data client. Absent when xpack.mitreAttack.managedSourceEnabled is off. */
  mitreDataClient?: MitreAttackDataClient;
  logger?: Logger;
}

interface HandleCoverageOverviewRequestArgs {
  params: CoverageOverviewRequestBody;
  deps: CoverageOverviewRouteDependencies;
}

export async function handleCoverageOverviewRequest({
  params: { filter },
  deps: { rulesClient, mitreDataClient, logger },
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

  // Only resolve buckets for frameworks the fetched rules reference (Enterprise is always
  // included). A framework whose buckets are unavailable is skipped (no invalid-ID detection
  // and no id validation for it) rather than failing the request.
  const referencedFrameworks = new Set<MitreFramework>(['enterprise']);
  for (const rule of rules.data) {
    for (const { framework } of iterateMitreThreatEntities(rule.params.threat)) {
      referencedFrameworks.add(framework);
    }
  }
  const bucketsByFramework = await resolveMitreBucketsByFramework(
    mitreDataClient,
    Array.from(referencedFrameworks),
    logger
  );
  const validIdsByFramework: ValidMitreIdSetsByFramework = {};
  for (const framework of referencedFrameworks) {
    const buckets = bucketsByFramework[framework];
    if (buckets) {
      validIdsByFramework[framework] = buildValidMitreIdsFromBuckets(buckets);
    } else {
      logger?.debug(
        `MITRE buckets unavailable for framework "${framework}"; invalid-ID detection will be skipped for it`
      );
    }
  }

  return rules.data.reduce((acc, rule) => appendRuleToResponse(acc, rule, validIdsByFramework), {
    // No prototype, so ids like `constructor` or `__proto__` on a rule are plain keys.
    coverage: Object.create(null),
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
  // Frameworks absent from the map (bucket resolution failed) skip invalid-ID detection
  validIdsByFramework: ValidMitreIdSetsByFramework
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

  const invalidIdsByFramework = findInvalidMitreIdsByFramework(
    rule.params.threat,
    validIdsByFramework
  );
  if (Object.keys(invalidIdsByFramework).length > 0) {
    response.invalid_mitre_ids[rule.id] = invalidIdsByFramework as Record<string, string[]>;
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
 * Extracts a deduplicated list of MITRE (ATT&CK Enterprise, ATLAS and ICS) tactic, technique, and
 * sub-technique ids referenced by a rule. ATLAS ids (`AML.` prefix) are only counted when the
 * entry is labelled ATLAS, and vice versa, so a mislabelled entry does not bleed into the other
 * framework's matrix. Enterprise and ICS ids are not distinguishable by shape, so mislabelling
 * between those two is not detected. A rule with no counted ids is unmapped.
 */
function extractRuleMitreCategories(rule: SanitizedRule<CoverageOverviewRuleParams>): string[] {
  // dedupe in case data isn't valid in ES
  const categories = new Set<string>();
  for (const { id, framework } of iterateMitreThreatEntities(rule.params.threat)) {
    if (isAtlasEntityId(id) === (framework === 'atlas')) categories.add(id);
  }
  return Array.from(categories);
}
