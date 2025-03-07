/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { tool } from '@langchain/core/tools';

const toolDetails = {
  name: 'available_index_names',
  description:
    'Get the available indices in the elastic search cluster. Use this when there is an unknown index error or you need to get the indeces that can be queried. Using the response select an appropriate index name.',
};

export const getIndexNamesTool = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return tool(
    async () => {
      const indexNames = await esClient.cat
        .indices({
          format: 'json',
        })
        .then((response) =>
          response
            .map((index) => index.index)
            .filter((index) => index != undefined)
            .toSorted()
        );
      return `These are the names of the available indeces. To query them, you must use the full index name verbatim.\n\n${indexNames.join(
        '\n'
      )}`;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
    }
  );
};
