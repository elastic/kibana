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

  // Coverage is accumulated per (framework, id) so an id shared by two frameworks never merges
  // their rules and a mislabelled id stays scoped to the framework it is labelled with.
  const coverageByFramework = new Map<MitreFramework, Map<string, Set<string>>>();
  const response = rules.data.reduce(
    (acc, rule) => appendRuleToResponse(acc, rule, validIdsByFramework, coverageByFramework),
    {
      coverage: {},
      unmapped_rule_ids: [],
      rules_data: {},
      invalid_mitre_ids: {},
    } as CoverageOverviewResponse
  );
  response.coverage = buildCoverageResponse(coverageByFramework);
  return response;
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
  validIdsByFramework: ValidMitreIdSetsByFramework,
  coverageByFramework: Map<MitreFramework, Map<string, Set<string>>>
): CoverageOverviewResponse {
  const categories = extractRuleMitreCategories(rule);

  for (const { framework, id } of categories) {
    const coverageById = coverageByFramework.get(framework) ?? new Map<string, Set<string>>();
    const ruleIds = coverageById.get(id) ?? new Set<string>();
    ruleIds.add(rule.id);
    coverageById.set(id, ruleIds);
    coverageByFramework.set(framework, coverageById);
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
 * Builds the response's `coverage` map keyed by framework, then by id. Frameworks without
 * coverage are omitted.
 */
function buildCoverageResponse(
  coverageByFramework: Map<MitreFramework, Map<string, Set<string>>>
): CoverageOverviewResponse['coverage'] {
  const coverage: CoverageOverviewResponse['coverage'] = {};
  for (const [framework, coverageById] of coverageByFramework) {
    const frameworkCoverage: Record<string, [string, ...string[]]> = {};
    for (const [id, ruleIds] of coverageById) {
      const [firstRuleId, ...otherRuleIds] = Array.from(ruleIds);
      frameworkCoverage[id] = [firstRuleId, ...otherRuleIds];
    }
    coverage[framework] = frameworkCoverage;
  }
  return coverage;
}

/**
 * Extracts the deduplicated (framework, id) tactic, technique, and sub-technique pairs a rule
 * has mapped. The framework comes from the threat entry's `framework` string, never from the id:
 * ATT&CK Enterprise and ICS ids are indistinguishable by shape. Coverage is keyed by framework,
 * so an id labelled with the wrong framework never reaches another framework's matrix; it is
 * reported through `invalid_mitre_ids` instead.
 *
 * A rule is unmapped only when it has no MITRE threat entries at all. A rule whose only ids are
 * invalid or mislabelled is not unmapped: it is reported as invalidly mapped.
 */
function extractRuleMitreCategories(
  rule: SanitizedRule<CoverageOverviewRuleParams>
): Array<{ framework: MitreFramework; id: string }> {
  // dedupe in case data isn't valid in ES
  const categories = new Map<string, { framework: MitreFramework; id: string }>();
  for (const { framework, id } of iterateMitreThreatEntities(rule.params.threat)) {
    categories.set(`${framework}:${id}`, { framework, id });
  }
  return Array.from(categories.values());
}
