/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';

export const fetchUniqueRuleId = async (
  client: ElasticsearchClient,
  synonymsSetId: string
): Promise<string> => {
  // Try to generate a unique rule ID arbitrary times
  for (let i = 0; i < 20; i++) {
    const randomizedId = `rule-${uuidv4().split('-')[4]}`;
    try {
      await client.synonyms.getSynonymRule({
        set_id: synonymsSetId,
        rule_id: randomizedId,
      });
    } catch (e) {
      return randomizedId;
    }
  }
  throw new Error('Unable to generate a unique rule ID');
};
