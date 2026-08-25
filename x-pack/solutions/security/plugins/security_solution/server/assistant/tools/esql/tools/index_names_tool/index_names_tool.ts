/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { tool } from '@langchain/core/tools';

export const toolDetails = {
  name: 'available_index_names',
  description:
    'Get the available indices in the elastic search cluster. Use this when there is an unknown index error or you need to get the available indices.',
};

export const getIndexNamesTool = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return tool(
    async () => {
      const indicesResolveIndexResponse = await esClient.indices.resolveIndex({
        name: '*',
        expand_wildcards: 'open',
      });

      const resolvedIndexNames = Object.values(indicesResolveIndexResponse)
        .flat()
        .map((item) => item.name as string)
        .sort((a, b) => {
          if (a.startsWith('.') && !b.startsWith('.')) return 1;
          if (!a.startsWith('.') && b.startsWith('.')) return -1;
          return a.localeCompare(b);
        });

      return `You can use the wildcard character "*" to query multiple indices at once. For example, if you want to query all logs indices that start with "logs-", you can use "logs-*". If the precice index was not specified in the task, it is best to make a more general query using a wildcard. Bellow are the available indecies:
      
${resolvedIndexNames.join('\n')}`;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
    }
  );
};
