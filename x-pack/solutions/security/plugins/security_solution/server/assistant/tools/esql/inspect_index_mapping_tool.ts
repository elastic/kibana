/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { formatEntriesAtKey, getEntriesAtKey, GetEntriesAtKeyMapping } from './utils/inspect_index_utils';

const toolDetails = {
  name: 'inspect_index_mapping',
  description: `Use this tool to inspect an index mapping. The tool with fetch the mappings of the provided indexName and then return the data at the given propertyKey. For example:
Example index mapping:
\`\`\`
{
    "mappings": {
        "properties": {
            "field1": {
                "type": "keyword"
            },
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }
            }
        }
    }
}
\`\`\`
Input:
\`\`\`
{
    "indexName": "my_index",
    "propertyKey": "mappings.properties"
}
\`\`\`
Output:
\`\`\`
{
    "field1": "Object",
    "field2": "Object"
}
\`\`\
The tool can be called repeatedly to explode objects. For example:
Input:
\`\`\`
{
    "indexName": "my_index",
    "propertyKey": "mappings.properties.field1"
}
\`\`\`
Output:
\`\`\`
{
    "type": "keyword",
}
\`\`\``,
};


export const getInspectIndexMappingTool = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return tool(
    async ({ indexName, propertyKey }) => {
      const indexMapping = await esClient.indices.getMapping({
        index: indexName,
      });

      const entriesAtKey = getEntriesAtKey(indexMapping[indexName] as unknown as GetEntriesAtKeyMapping, propertyKey.split('.'));
      const result = formatEntriesAtKey(entriesAtKey);

      return `Object at ${propertyKey} \n${JSON.stringify(result, null, 2)}`;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        indexName: z.string().describe(`The index name to get the properties of.`),
        propertyKey: z
          .string()
          .optional()
          .default('mappings.properties')
          .describe(`The key to get the properties of.`),
      }),
    }
  );
};