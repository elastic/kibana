/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export async function clearEntityDefinitions(esClient: ElasticsearchClient) {
  await esClient.deleteByQuery({
    index: '.kibana-entities-definitions',
    query: {
      match_all: {},
    },
  });
}
