/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import type { ElasticsearchClient } from '@kbn/core/server';

import { bulkInsert, setupTestServers, removeFile } from './lib/helpers';
import { getTelemetryReceiver } from './lib/telemetry_helpers';

import type { ITelemetryReceiver } from '../lib/telemetry/receiver';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Plugin as SecuritySolutionPlugin } from '../plugin';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Nullable } from '../lib/telemetry/types';

// not needed, but it avoids some error messages like "Error: Cross origin http://localhost forbidden"
jest.mock('axios');

const logFilePath = Path.join(__dirname, 'logs.log');

const securitySolutionPlugin = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

describe('ITelemetryReceiver', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let telemetryReceiver: ITelemetryReceiver;
  let esClient: ElasticsearchClient;
  const TEST_INDEX = 'test';

  beforeAll(async () => {
    await removeFile(logFilePath);

    const servers = await setupTestServers(logFilePath);
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    expect(securitySolutionPlugin).toHaveBeenCalledTimes(1);

    telemetryReceiver = getTelemetryReceiver(securitySolutionPlugin);

    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await esClient.indices.create({ index: TEST_INDEX }).catch(() => {});
  });

  afterEach(async () => {
    await esClient.indices.delete({ index: TEST_INDEX }).catch(() => {});
  });

  describe('paginate', () => {
    const numOfDocs = 400;
    const maxPageSizeBytes = 1_000;

    beforeEach(async () => {
      telemetryReceiver.setMaxPageSizeBytes(maxPageSizeBytes);
    });

    afterEach(async () => {
      await esClient.deleteByQuery({ index: TEST_INDEX }).catch(() => {});
    });

    it('should paginate queries', async () => {
      const docs = mockedDocs(numOfDocs);
      await bulkInsert(esClient, TEST_INDEX, docs);

      const results = telemetryReceiver.paginate(TEST_INDEX, testQuery());

      const pages = await getPages(results);

      const pageSize = Math.floor(maxPageSizeBytes / JSON.stringify(docs[0]).length);
      expect(pages.length).toEqual(Math.ceil(numOfDocs / pageSize));
      expect(pages.flat()).toEqual(docs);
    });

    it('should return only expected data', async () => {
      const from = new Date().toISOString();
      const batchOne = mockedDocs(numOfDocs);
      const to = new Date().toISOString();

      // wait for 500 ms to ensure that the timestamp of the next batch has different @timestamps
      await new Promise((resolve) => setTimeout(resolve, 500));
      const batchTwo = mockedDocs(numOfDocs, 'batchTwo');

      await bulkInsert(esClient, TEST_INDEX, batchTwo);
      await bulkInsert(esClient, TEST_INDEX, batchOne);

      const results = telemetryReceiver.paginate(TEST_INDEX, testQuery(from, to));

      const pages = await getPages(results);

      const pageSize = Math.floor(maxPageSizeBytes / JSON.stringify(batchOne[0]).length);
      expect(pages.length).toEqual(Math.ceil(numOfDocs / pageSize));
      expect(pages.flat()).toEqual(batchOne);
    });

    it('should manage empty response', async () => {
      await bulkInsert(esClient, TEST_INDEX, mockedDocs(numOfDocs));

      const results = telemetryReceiver.paginate(TEST_INDEX, testQuery('now-2d', 'now-1d'));

      const pages = await getPages(results);
      expect(pages.length).toEqual(0);
    });
  });

  function mockedDocs(length: number, valuePrefix: string = 'value'): object[] {
    const docs = Array.from({ length }, (_, i) => ({
      '@timestamp': new Date().toISOString(),
      data: {
        key: `${valuePrefix}_${i}`,
      },
    }));
    return docs;
  }

  function testQuery(
    from: Nullable<string> = undefined,
    to: Nullable<string> = undefined
  ): SearchRequest {
    return {
      query: {
        range: {
          '@timestamp': {
            lte: to ?? new Date().toISOString(),
            gte: from ?? 'now-1d',
          },
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'asc' as const,
          },
        },
      ],
    };
  }

  async function getPages(it: AsyncGenerator<unknown[], void, unknown>): Promise<unknown[][]> {
    const pages = [];
    for await (const doc of it) {
      pages.push(doc);
    }
    return pages;
  }
});
