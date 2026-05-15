/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { ingestEntities } from './ingest';

/**
 * Drains the streaming `datasource` generator that {@link ingestEntities}
 * passes to `esClient.helpers.bulk`, recording every doc that survives the
 * upstream null-id guard. Used by the regression tests below to assert which
 * rows actually reach the bulk API without spinning up a real
 * `@elastic/elasticsearch` helpers.bulk implementation.
 */
const captureBulkDocsFn = (collected: Array<Record<string, unknown>>) =>
  jest.fn(async (params: { datasource: AsyncIterable<Record<string, unknown>> }) => {
    for await (const doc of params.datasource) {
      collected.push(doc);
    }
    return {} as unknown;
  });

describe('ingestEntities', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
  });

  // Lumos activity-logs regression: an alias-scoped pass that loses its
  // upstream null-identity guard would emit ESQL rows whose
  // `entity.hashedId` (the column used as `_id`) is `null`. Without this
  // backstop those rows reach `helpers.bulk` as `_id: null`, which
  // Elasticsearch rejects with `action_request_validation_exception:
  // Validation Failed: 1: id is missing` and aborts the entire batch.
  //
  // The query builder fix prevents the rows from existing in the first
  // place; this test pins the ingest layer's defense-in-depth so a future
  // regression at the query layer surfaces as a counted warn instead of a
  // hard ingest failure.
  it('skips rows whose esIdField column is null and warns once with the dropped count', async () => {
    const captured: Array<Record<string, unknown>> = [];
    esClient.helpers.bulk = captureBulkDocsFn(captured) as unknown as typeof esClient.helpers.bulk;

    const esqlResponse: ESQLSearchResponse = {
      took: 1,
      columns: [
        { name: 'entity.hashedId', type: 'keyword' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ],
      // First row has the typical alias-pass output; the next two have a NULL
      // and an empty-string identity respectively (both produced by upstream
      // EUID composition failures). Only the first row should reach bulk.
      values: [
        ['hash-1', 'user:alice@entra_id', 'alice'],
        [null, null, null],
        ['', null, null],
      ],
    };

    await ingestEntities({
      esClient,
      esqlResponse,
      esIdField: 'entity.hashedId',
      targetIndex: 'latest-index',
      logger,
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual({
      _id: 'hash-1',
      'entity.id': 'user:alice@entra_id',
      'entity.name': 'alice',
    });

    const warnCalls = logger.warn.mock.calls.flat();
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0]).toMatch(/Skipped 2 entity row\(s\) with null\/empty "entity\.hashedId"/);
  });

  it('does not skip or warn when esIdField is omitted (auto-id mode)', async () => {
    const captured: Array<Record<string, unknown>> = [];
    esClient.helpers.bulk = captureBulkDocsFn(captured) as unknown as typeof esClient.helpers.bulk;

    // In auto-id mode (no esIdField) the engine writes via `create` and ES
    // generates the _id, so a "null identity column" doesn't apply — every
    // row with non-null payload columns must reach bulk.
    const esqlResponse: ESQLSearchResponse = {
      took: 1,
      columns: [{ name: 'entity.id', type: 'keyword' }],
      values: [['e-1'], ['e-2']],
    };

    await ingestEntities({
      esClient,
      esqlResponse,
      targetIndex: 'latest-index',
      logger,
    });

    expect(captured).toHaveLength(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn when no rows are dropped', async () => {
    const captured: Array<Record<string, unknown>> = [];
    esClient.helpers.bulk = captureBulkDocsFn(captured) as unknown as typeof esClient.helpers.bulk;

    const esqlResponse: ESQLSearchResponse = {
      took: 1,
      columns: [
        { name: 'entity.hashedId', type: 'keyword' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['hash-1', 'user:alice@entra_id'],
        ['hash-2', 'user:bob@entra_id'],
      ],
    };

    await ingestEntities({
      esClient,
      esqlResponse,
      esIdField: 'entity.hashedId',
      targetIndex: 'latest-index',
      logger,
    });

    expect(captured).toHaveLength(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
