/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

export async function cleanFleetIndices(esClient: Client) {
  await Promise.all([
    esClient.deleteByQuery({
      index: '.fleet-enrollment-api-keys',
      q: '*',
      ignore_unavailable: true,
      refresh: true,
    }),
    esClient.deleteByQuery({
      index: '.fleet-agents',
      q: '*',
      ignore_unavailable: true,
      refresh: true,
    }),
  ]);
}
