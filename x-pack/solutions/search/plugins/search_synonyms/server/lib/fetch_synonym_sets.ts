/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynonymsGetSynonymsSetsResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

// TODO: pagination
export const fetchSynonymSets = async (
  client: ElasticsearchClient
): Promise<SynonymsGetSynonymsSetsResponse> => {
  const result = await client.synonyms.getSynonymsSets();
  return result;
};
