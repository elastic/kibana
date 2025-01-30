/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynonymsPutSynonymResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const putSynonymsSet = async (
  client: ElasticsearchClient,
  synonymsSetId: string
): Promise<SynonymsPutSynonymResponse> => {
  return client.synonyms.putSynonym({
    id: synonymsSetId,
    body: {
      synonyms_set: [],
    },
  });
};
