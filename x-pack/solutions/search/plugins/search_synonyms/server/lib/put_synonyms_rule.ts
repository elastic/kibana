/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynonymsPutSynonymRuleResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const putSynonymsRule = async (
  client: ElasticsearchClient,
  synonymsSetId: string,
  ruleId: string,
  synonyms: string
): Promise<SynonymsPutSynonymRuleResponse> => {
  return client.synonyms.putSynonymRule({
    set_id: synonymsSetId,
    rule_id: ruleId,
    synonyms,
  });
};
