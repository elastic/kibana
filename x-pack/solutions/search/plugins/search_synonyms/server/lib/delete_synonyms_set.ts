/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const deleteSynonymsSet = async (client: ElasticsearchClient, synonymsSetId: string) => {
  return await client.synonyms.deleteSynonym({ id: synonymsSetId });
};
