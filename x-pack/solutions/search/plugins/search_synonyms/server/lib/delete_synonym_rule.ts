/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const deleteSynonymRule = async (
  client: ElasticsearchClient,
  synonymsSetId: string,
  ruleId: string
) => {
  return client.synonyms.deleteSynonymRule({ set_id: synonymsSetId, rule_id: ruleId });
};
