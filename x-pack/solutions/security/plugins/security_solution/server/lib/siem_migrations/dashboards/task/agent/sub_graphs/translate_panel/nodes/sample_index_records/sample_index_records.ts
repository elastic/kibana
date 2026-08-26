/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveResourceForEsqlWithSamplingStats } from '@kbn/agent-builder-genai-utils';
import { hasValidIndexPattern } from '../../../../helpers/has_valid_index_pattern';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';

const SAMPLING_SIZE = 10;

const NO_DATA_WARNING = `## ⚠️ No Data Found in Index

The index was identified but contains no data. This impacts the quality of the translation:

- **Field value formats cannot be inferred** from sample records, which may lead to incorrect value comparisons and filters in the generated ES|QL query.
- **Field mapping accuracy is reduced** since sample values are used to match SPL fields to the correct Elasticsearch fields.

**Recommendation:** Onboard data into this index and re-run the migration for more accurate field mapping and query generation.`;

export const getSampleIndexRecordsNode = (params: TranslatePanelGraphParams): GraphNode => {
  return async (state) => {
    if (!hasValidIndexPattern(state.index_pattern)) {
      params.logger.warn('No index pattern available for sampling');
      return {};
    }

    try {
      const resolvedResource = await resolveResourceForEsqlWithSamplingStats({
        resourceName: state.index_pattern,
        esClient: params.esScopedClient.asCurrentUser,
        samplingSize: SAMPLING_SIZE,
      });

      const hasData = resolvedResource.fields.some((field) => field.stats.filledDocCount > 0);

      if (!hasData) {
        return {
          resolved_resource: resolvedResource,
          comments: [generateAssistantComment(NO_DATA_WARNING)],
        };
      }

      return { resolved_resource: resolvedResource };
    } catch (error) {
      params.logger.error(`Error fetching sample index records: ${error}`);
      return {
        comments: [
          generateAssistantComment(
            `⚠️ Error fetching records from index pattern : \`${state.index_pattern}\`: ${error}.

                      This will impact the accuracy of the generated ES|QL query, as field value formats cannot be correctly inferred and field mapping accuracy is reduced.

                      **Recommendation:** Make sure this index is available and re-run the migration for more accurate field mapping and query generation.`
          ),
        ],
      };
    }
  };
};
