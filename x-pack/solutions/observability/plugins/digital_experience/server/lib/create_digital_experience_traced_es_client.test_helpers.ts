/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createDigitalExperienceTracedEsClient } from './create_digital_experience_traced_es_client';

/** The app's traced client around a mocked Elasticsearch client, whose calls the tests assert. */
export const createTracedEsClientMock = (abortSignal?: AbortSignal) => {
  const client = elasticsearchServiceMock.createElasticsearchClient();
  const esClient = createDigitalExperienceTracedEsClient({
    client,
    logger: loggingSystemMock.createLogger(),
    abortSignal,
  });
  return { client, esClient };
};
