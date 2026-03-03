/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { createElasticsearchToolGraph } from './graph';

export const getToolHandler = async ({
  core,
  nlQuery,
  modelProvider,
  esClient,
  events,
  request,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  nlQuery: string;
  modelProvider: ModelProvider;
  esClient: IScopedClusterClient;
  events: ToolEventEmitter;
  request: KibanaRequest;
}) => {
  const toolGraph = await createElasticsearchToolGraph({
    core,
    modelProvider,
    esClient,
    events,
    request,
  });

  return withActiveInferenceSpan(
    'ElasticsearchToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { nlQuery },
        { tags: ['elasticsearch_tool'], metadata: { graphName: 'elasticsearch_tool' } }
      );

      if (outState.error) {
        throw new Error(outState.error);
      }

      return outState.results[0];
    }
  );
};
