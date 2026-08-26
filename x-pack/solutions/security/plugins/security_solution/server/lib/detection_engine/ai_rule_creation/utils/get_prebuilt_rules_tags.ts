/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { createPrebuiltRuleAssetsClient } from '../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';

export const getPrebuiltRulesTags = async ({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<string[]> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

  const latestRuleVersions = await ruleAssetsClient.fetchLatestVersions();
  const tags = await ruleAssetsClient.fetchTagsByVersion(latestRuleVersions);

  return tags;
};
