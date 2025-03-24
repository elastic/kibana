/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import {
  shallowObjectViewTruncated,
  getNestedValue,
  mapFieldDescriptorToNestedObject,
} from './utils/inspect_index_utils';

const toolDetails = {
  name: 'inspect_index_mapping',
  description: `Use this tool when there is a "verification_exception Unknown column" error or to see which fields and types are used in the index. Call this tool repeatedly to inspect nested fields.
This is an example of the fields in logs-*:
\`\`\`
${JSON.stringify(
  {
    field1: {
      type: 'keyword',
    },
    field2: {
      nested_field: {
        type: 'keyword',
      },
    },
  },
  null,
  2
)}
\`\`\`
To get the properties of the root object, call the tool with an empty string as the key. For example:
\`\`\`
{
    "indexName": "logs-*",
    "key": "" // empty string to get the root object
}
\`\`\`
Output:
\`\`\`
{
    "field1": {
      "type": "keyword",
    },
    "field2": {
      "nested_field": "Object" // shallow view of the nested object
    }
}
\`\`\
The tool can be called repeatedly to explore the nested fields. For example:
\`\`\`
${JSON.stringify(
  {
    indexName: 'logs-*',
    key: 'field2.nested_field',
  },
  null,
  2
)}
\`\`\`
Output:
\`\`\`
${JSON.stringify(
  {
    type: 'keyword',
  },
  null,
  2
)}
\`\`\``,
};

export const getInspectIndexMappingTool = ({ esClient }: { esClient: ElasticsearchClient }) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);

  return tool(
    async ({ indexName, key }) => {
      const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: indexName,
        fieldCapsOptions: {
          allow_no_indices: false,
          includeUnmapped: false,
        },
      });

      const nestedObject = mapFieldDescriptorToNestedObject(fields);
      const value = getNestedValue(nestedObject, key);
      const shallowObjectView = shallowObjectViewTruncated(value, 30000);
      const message = `${key} in the index ${indexName} looks like this:\n${JSON.stringify(
        shallowObjectView,
        null,
        2
      )}`;

      return message;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        indexName: z
          .string()
          .describe(
            `The index name to get the properties of. For example "logs-*" or "traces.default.2022-01-01"`
          ),
        key: z
          .string()
          .optional()
          .default('')
          .describe(
            `The field to get the properties of. Use an empty string to get the root object or key1.key2 to get nested properties.`
          ),
      }),
    }
  );
};
