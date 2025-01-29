/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

interface IndexAlias {
  alias: string;
  space: string;
  indexName: string;
}

/**
 * Retrieves index, its alias and Kibana space
 */
export const getIndexAliasPerSpace = async ({
  esClient,
  signalsIndex,
  signalsAliasAllSpaces,
}: {
  esClient: ElasticsearchClient;
  signalsIndex: string;
  signalsAliasAllSpaces: string;
}): Promise<Record<string, IndexAlias>> => {
  const response = await esClient.indices.getAlias(
    {
      name: signalsAliasAllSpaces,
    },
    { meta: true }
  );

  const indexAliasesMap = Object.keys(response.body).reduce<Record<string, IndexAlias>>(
    (acc, indexName) => {
      if (!indexName.startsWith('.internal.alerts-')) {
        const alias = Object.keys(response.body[indexName].aliases)[0];

        acc[indexName] = {
          alias,
          space: alias.replace(`${signalsIndex}-`, ''),
          indexName,
        };
      }

      return acc;
    },
    {}
  );

  return indexAliasesMap;
};
