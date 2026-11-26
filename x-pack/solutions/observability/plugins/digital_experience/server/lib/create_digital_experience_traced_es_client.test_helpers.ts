/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
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

/**
 * The response of `client.esql.query` with `rows`, as columns and values; a column a row lacks is
 * null in it. For `mockResolvedValue`, whose response type it doesn't spell out.
 */
export const esqlResponse = (rows: ReadonlyArray<Record<string, unknown>>): never => {
  const names = uniq(rows.flatMap((row) => Object.keys(row)));
  return {
    body: {
      columns: names.map((name) => ({ name, type: 'keyword' })),
      values: rows.map((row) => names.map((name) => row[name] ?? null)),
    },
  } as never;
};
