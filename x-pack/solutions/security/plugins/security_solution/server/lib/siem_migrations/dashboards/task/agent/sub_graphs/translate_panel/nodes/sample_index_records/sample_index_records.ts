/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveResourceForEsqlWithSamplingStats } from '@kbn/agent-builder-genai-utils';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';

const SAMPLING_SIZE = 10;

export const getSampleIndexRecordsNode = (params: TranslatePanelGraphParams): GraphNode => {
  return async (state) => {
    if (!state.index_pattern) {
      params.logger.warn('No index pattern available for sampling');
      return {};
    }

    try {
      const resolvedResource = await resolveResourceForEsqlWithSamplingStats({
        resourceName: state.index_pattern,
        esClient: params.esScopedClient.asInternalUser,
        samplingSize: SAMPLING_SIZE,
      });

      const hasData = resolvedResource.fields.some((field) => field.stats.filledDocCount > 0);

      if (!hasData) {
        return {
          resolved_resource: resolvedResource,
          comments: [
            generateAssistantComment(
              `No data found in index \`${state.index_pattern}\`. The generated query may have incorrect field values.`
            ),
          ],
        };
      }

      return { resolved_resource: resolvedResource };
    } catch (error) {
      params.logger.error(`Error fetching sample index records: ${error}`);
      return {
        comments: [
          generateAssistantComment(
            `Failed to fetch sample records from index \`${state.index_pattern}\`: ${error}`
          ),
        ],
      };
    }
  };
};
