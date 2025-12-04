/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ToolHandlerContext, ToolHandlerResult } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { createElasticsearchToolGraph } from './graph';

export const runElasticsearchTool = async ({
  nlQuery,
  query,
  toolHandlerContext,
}: {
  nlQuery: string;
  query: string;
  toolHandlerContext: ToolHandlerContext;
}): Promise<ToolHandlerResult[]> => {
  const toolGraph = await createElasticsearchToolGraph(toolHandlerContext);

  return withActiveInferenceSpan(
    'ElasticsearchToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { nlQuery, query },
        { tags: ['elasticsearch_tool'], metadata: { graphName: 'elasticsearch_tool' } }
      );

      if (outState.error) {
        return [
          {
            type: ToolResultType.error,
            data: { message: outState.error },
          },
        ];
      }

      return outState.results;
    }
  );
};
