/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPrebuiltRuleObjectsClient,
  type RuleSummary,
} from './rule_objects/prebuilt_rule_objects_client';

/**
 * Fetches the currently-installed prebuilt rule versions and returns them keyed by `rule_id`.
 * The installable-rules query path uses this map to exclude already-installed rules. Shared by
 * the review-installation endpoint and the Agent Builder tools so the fetch isn't duplicated.
 */
export const fetchInstalledRuleVersionsMap = async (
  rulesClient: Parameters<typeof createPrebuiltRuleObjectsClient>[0]
): Promise<Map<string, RuleSummary>> => {
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
  const installedRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();

  return new Map(installedRuleVersions.map((version) => [version.rule_id, version]));
};
