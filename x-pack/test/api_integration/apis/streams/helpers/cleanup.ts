/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

/**
DELETE .kibana_streams
DELETE _data_stream/logs
DELETE /_index_template/logs@stream
DELETE /_component_template/logs@stream.layer
DELETE /_ingest/pipeline/logs@json-pipeline
DELETE /_ingest/pipeline/logs@stream.processing
DELETE /_ingest/pipeline/logs@stream.reroutes
*/

export async function cleanUpRootStream(esClient: Client) {
  await esClient.indices.delete({ index: '.kibana_streams' });
  await esClient.indices.deleteDataStream({ name: 'logs' });
  await esClient.indices.deleteIndexTemplate({ name: 'logs@stream' });
  await esClient.cluster.deleteComponentTemplate({ name: 'logs@stream.layer' });
  await esClient.ingest.deletePipeline({ id: 'logs@stream.*' });
}
