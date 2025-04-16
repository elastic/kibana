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
  getNestedValue,
  mapFieldDescriptorToNestedObject,
  shallowObjectViewTruncated,
} from './inspect_index_utils';

export const toolDetails = {
  name: 'inspect_index_mapping',
  description:
    'Use this tool when there is a "verification_exception Unknown column" error or to see which fields and types are used in the index.' +
    'This function will return as much of the index mapping as possible. If the index mapping is too large, some values will be truncated as indicated by "...".' +
    'Call the function again to inspected truncated values.' +
    `Example:
Index mapping:
{"user":{"address":{"city":{"name":{"type":"keyword"},"zip":{"type":"integer"}}}}}}

Call #1:
Property: "" // empty string to get the root
Function response: {"user":{"address":{"city":"...","zip":"..."}}}

Call #2:
Property: "user.address.city"
Function response: {"name":{"type":"keyword"}
`,
};

export const getInspectIndexMappingTool = ({
  esClient,
  indexPattern,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
}) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);
  return tool(
    async ({ property }) => {
      const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: indexPattern,
        fieldCapsOptions: {
          allow_no_indices: false,
          includeUnmapped: false,
        },
      });

      const prunedFields = fields.map((p) => ({ name: p.name, type: p.esTypes[0] }));
      const nestedObject = mapFieldDescriptorToNestedObject(prunedFields);
      const nestedValue = getNestedValue(nestedObject, property);
      const result = shallowObjectViewTruncated(nestedValue, 30000);

      return result ? JSON.stringify(result) : `No value found for property "${property}".`;
    },
    {
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        property: z
          .string()
          .describe(
            `The property to inspect. The property should be a dot-separated path to the field in the index mapping. For example, "user.name" or "user.address.city". Empty string will return the root.`
          ),
      }),
    }
  );
};
