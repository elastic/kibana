/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ingestEntities } from './ingest';

const TARGET_INDEX = '.entities.v2.latest.security_default';

const makeEsqlResponse = (rowCount: number): ESQLSearchResponse => ({
  columns: [{ name: 'entity.id', type: 'keyword' }],
  values: Array.from({ length: rowCount }, (_, i) => [`entity-${i}`]),
});

describe('ingestEntities', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
  });

  // Drains the helper `datasource` (so the mock counts docs) and invokes
  // `onDrop` once per simulated drop before resolving.
  const mockHelpersBulk = (
    drops: Array<{ status: number; error?: { type?: string; reason?: string } }> = []
  ) => {
    const impl = jest.fn().mockImplementation(async (opts: any) => {
      let total = 0;
      for await (const _ of opts.datasource) total++;
      for (const drop of drops) {
        opts.onDrop({ ...drop, document: {}, operation: { create: {} }, retried: false });
      }
      const failed = drops.length;
      return { total, failed, successful: total - failed };
    });
    esClient.helpers.bulk = impl as unknown as typeof esClient.helpers.bulk;
    return impl;
  };

  it('does not log when nothing is dropped', async () => {
    mockHelpersBulk();
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(2),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a single aggregated error line instead of one per dropped doc', async () => {
    mockHelpersBulk([
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
    ]);
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(3),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('security_exception (3, status 403): unauthorized')
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(TARGET_INDEX));
  });

  it('still invokes onDropped once per dropped doc (metric callback unaffected by log aggregation)', async () => {
    mockHelpersBulk([
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      { status: 400, error: { type: 'mapper_parsing_exception', reason: 'bad field' } },
    ]);
    const onDropped = jest.fn();
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(2),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
      onDropped,
    });
    expect(onDropped).toHaveBeenCalledTimes(2);
  });

  it('does not call onDropped when nothing is dropped', async () => {
    mockHelpersBulk();
    const onDropped = jest.fn();
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(2),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
      onDropped,
    });
    expect(onDropped).not.toHaveBeenCalled();
  });

  it('groups drops by error type, collapsing repeats but keeping distinct types separate', async () => {
    mockHelpersBulk([
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      { status: 400, error: { type: 'mapper_parsing_exception', reason: 'bad field' } },
    ]);
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(3),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message] = logger.error.mock.calls[0];
    expect(message).toContain('security_exception (2, status 403): unauthorized');
    expect(message).toContain('mapper_parsing_exception (1, status 400): bad field');
  });

  it('does nothing (no bulk call, no log) when the ESQL response has no rows', async () => {
    mockHelpersBulk();
    await ingestEntities({
      esClient,
      esqlResponse: makeEsqlResponse(0),
      targetIndex: TARGET_INDEX,
      logger,
      refresh: false,
    });
    expect(esClient.helpers.bulk).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
