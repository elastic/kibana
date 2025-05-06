/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const isQueryRulesetExist = async (
  client: ElasticsearchClient,
  rulesetId: string
): Promise<boolean> => {
  try {
    const ruleset = await client.queryRules.getRuleset({
      ruleset_id: rulesetId,
    });
    if (ruleset) {
      return true;
    }
    return false;
  } catch (error) {
    if (error.meta?.statusCode === 404) return false;
    throw error;
  }
};
