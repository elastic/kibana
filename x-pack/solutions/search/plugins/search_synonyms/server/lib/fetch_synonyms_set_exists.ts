/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const fetchSynonymsSetExists = async (
  client: ElasticsearchClient,
  synonymsSetId: string
): Promise<boolean> => {
  try {
    await client.synonyms.getSynonym({ id: synonymsSetId });
    return true;
  } catch (e) {
    if (e.statusCode === 404) {
      return false;
    }
    throw e;
  }
};
