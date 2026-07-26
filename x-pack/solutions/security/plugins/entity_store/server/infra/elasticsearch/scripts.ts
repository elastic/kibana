/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient } from '@kbn/core/server';

export const putStoredScript = async (
  esClient: EsClient,
  name: string,
  painlessSource: string
): Promise<void> => {
  await esClient.putScript({
    id: name,
    script: {
      lang: 'painless',
      source: painlessSource,
    },
  });
};

export const deleteStoredScript = async (esClient: EsClient, name: string) => {
  await esClient.deleteScript({ id: name }, { ignore: [404] });
};
