/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { DEFINITIONS_ALIAS } from '@kbn/entityManager-plugin/server/lib/v2/constants';

export async function clearEntityDefinitions(esClient: ElasticsearchClient) {
  await esClient.deleteByQuery({
    index: DEFINITIONS_ALIAS,
    query: {
      match_all: {},
    },
    refresh: true,
  });
}
