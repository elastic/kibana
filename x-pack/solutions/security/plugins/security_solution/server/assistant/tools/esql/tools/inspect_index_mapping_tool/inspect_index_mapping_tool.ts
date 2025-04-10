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
} from './inspect_index_utils';
import { convertObjectFormat } from './compress_mapping';

export const toolDetails = {
  name: 'inspect_index_mapping',
  description: `Use this tool when there is a "verification_exception Unknown column" error or to see which fields and types are used in the index.`
};

export const getInspectIndexMappingTool = ({ esClient }: { esClient: ElasticsearchClient }) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);

  return tool(
    async ({ indexPattern }) => {
      const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: indexPattern,
        fieldCapsOptions: {
          allow_no_indices: false,
          includeUnmapped: false,
        },
      });

      const prunedFields = fields.map(p=>({name:p.name, type: p.esTypes[0]}))
      const nestedObject = mapFieldDescriptorToNestedObject(prunedFields);
      const result = convertObjectFormat(nestedObject);
  
      const message = `The index pattern '${indexPattern}' has the following keys and types:\n${result}`;

      return message;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        indexPattern: z
          .string()
          .describe(
            `The index name to get the properties of. For example "logs-*" or "traces.default.2022-01-01"`
          ),
      }),
    }
  );
};
