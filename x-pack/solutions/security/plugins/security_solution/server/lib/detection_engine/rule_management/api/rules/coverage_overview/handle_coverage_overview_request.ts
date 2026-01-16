/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
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

type CoverageOverviewRuleParams = Pick<RuleParams, 'threat'>;
interface IRule {
  id: string;
  name: string;
  activity: CoverageOverviewRuleActivity;
  threat: unknown;
  version?: number;
}
interface CoverageOverviewRouteDependencies {
  rulesClient: RulesClient;
}

interface HandleCoverageOverviewRequestArgs {
  params: CoverageOverviewRequestBody;
  deps: CoverageOverviewRouteDependencies;
}

export async function handleCoverageOverviewRequest({
  params: { filter },
  deps: { rulesClient, ruleAssetsClient },
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
  const installedRules = await findRules({
    rulesClient,
    filter: kqlFilter,
    fields: ['name', 'enabled', 'params.threat', 'params.ruleId'],
    page: 1,
    perPage: 10000,
    sortField: undefined,
    sortOrder: undefined,
  });

  // Fetch prebuilt (installable) rules
  // TODO: Limit this to only the attributes we need. To reduce memory footprint.
  const prebuiltRules = await ruleAssetsClient.fetchLatestAssets();

  // Converge installed and prebuilt rules into same type
  // Use the "prebuilt" rule_id as key to avoid duplication.
  const rules = new Map<string, IRule>();
  for (const rule of prebuiltRules) {
    rules.set(rule.rule_id, {
      id: rule.rule_id,
      name: rule.name,
      activity: CoverageOverviewRuleActivity.Available,
      threat: rule.threat,
      version: rule.version,
    });
  }
  for (const rule of installedRules.data) {
    rules.set(rule.params.ruleId, {
      id: rule.id,
      name: rule.name,
      activity: rule.enabled
        ? CoverageOverviewRuleActivity.Enabled
        : CoverageOverviewRuleActivity.Disabled,
      threat: rule.params.threat,
    });
  }

  // Add categories to response and return
  const response: CoverageOverviewResponse = {
    coverage: {},
    unmapped_rule_ids: [],
    rules_data: {},
  };
  for (const [id, rule] of rules) {
    const categories = extractRuleMitreCategories(rule.threat);

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

    response.rules_data[rule.id] = {
      name: rule.name,
      activity: rule.activity,
      version: rule.version,
    };
  }
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

/**
 * Extracts rule's MITRE ATT&CK™ tactics, techniques and subtechniques
 *
 * @returns an array of MITRE ATT&CK™ tactics, techniques and subtechniques
 */
function extractRuleMitreCategories(threat: unknown): string[] {
  if (!threat) {
    return [];
  }

  // avoid duplications just in case data isn't valid in ES
  const categories = new Set<string>();

  for (const threatItem of threat) {
    if (threatItem.framework !== 'MITRE ATT&CK') {
      // eslint-disable-next-line no-continue
      continue;
    }

    categories.add(threatItem.tactic.id);

    for (const technique of threatItem.technique ?? []) {
      categories.add(technique.id);

      for (const subtechnique of technique.subtechnique ?? []) {
        categories.add(subtechnique.id);
      }
    }
  }

  return Array.from(categories);
}
