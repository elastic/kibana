/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { IngestPipelineParams, fetchConnectorByIndexName } from '@kbn/search-connectors';

import { getDefaultPipeline } from './get_default_pipeline';

export const getIndexPipelineParameters = async (
  indexName: string,
  client: IScopedClusterClient
): Promise<IngestPipelineParams> => {
  // Get the default pipeline data and check for a custom pipeline in parallel
  // we want to throw the error if getDefaultPipeline() fails so we're not catching it on purpose
  const [defaultPipeline, connector, customPipelineResp] = await Promise.all([
    getDefaultPipeline(client),
    fetchConnectorByIndexName(client.asCurrentUser, indexName),
    client.asCurrentUser.ingest
      .getPipeline({
        id: `${indexName}`,
      })
      .catch(() => null),
  ]);
  if (connector && connector.pipeline) {
    return connector.pipeline;
  }
  const pipelineName = customPipelineResp?.[indexName] ? indexName : defaultPipeline.name;

  return {
    ...defaultPipeline,
    name: pipelineName,
  };
};
