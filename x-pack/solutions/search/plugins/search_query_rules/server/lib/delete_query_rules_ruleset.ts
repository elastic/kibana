/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const deleteRuleset = async (client: ElasticsearchClient, rulesetId: string) => {
  return await client.queryRules.deleteRuleset({ ruleset_id: rulesetId });
};
