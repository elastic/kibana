/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KibanaClient } from '../kibana_client';

export async function loadSampleData({
  logger,
  kibanaClient,
  sampleDataId,
}: {
  logger: ToolingLog;
  kibanaClient: KibanaClient;
  sampleDataId: 'ecommerce' | 'flights' | 'logs';
}): Promise<string> {
  logger.info('Loading sample data...');
  const sampleDataResponse = await kibanaClient.callKibana<{
    elasticsearchIndicesCreated: Record<string, number>;
    kibanaSavedObjectsLoaded: number;
  }>('POST', {
    pathname: `/api/sample_data/${sampleDataId}`,
  });
  const sampleDataIndex = Object.keys(sampleDataResponse.data.elasticsearchIndicesCreated)[0];
  logger.info(`Sample data index created: ${sampleDataIndex}`);
  return sampleDataIndex;
}
