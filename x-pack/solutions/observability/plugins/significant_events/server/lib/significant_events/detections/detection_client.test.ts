/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Detection } from '@kbn/significant-events-schema';
import { DetectionClient } from './detection_client';

type StoredDetection = Partial<Omit<Detection, 'processed'>> & {
  '@timestamp': string;
  detection_id: string;
};

// A stored detection as it comes back from the `_source` read (no derived `processed`).
const createDetection = (overrides: StoredDetection): Omit<Detection, 'processed'> =>
  ({
    rule_uuid: overrides.rule_uuid ?? 'rule-1',
    rule_name: overrides.rule_name ?? 'Rule 1',
    change_point_type: overrides.change_point_type ?? 'spike',
    ...overrides,
  } as Omit<Detection, 'processed'>);

const sourceResponse = (docs: Array<Record<string, unknown>>): ESQLSearchResponse =>
  ({
    columns: [{ name: '_source', type: 'object' }],
    values: docs.map((d) => [d]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

// One row per detection_id that has a processed marker.
const markerResponse = (ids: string[]): ESQLSearchResponse =>
  ({
    columns: [{ name: 'detection_id', type: 'keyword' }],
    values: ids.map((id) => [id]),
  } as unknown as ESQLSearchResponse);

interface MockResponses {
  // Detections returned by the latest/find data query (already collapsed by groupBy).
  detections: Array<Record<string, unknown>>;
  // detection_ids the processed-marker membership reports as processed.
  processedIds: string[];
}

const createClient = (responses: MockResponses) => {
  const query = jest.fn(async (request: { query: string }) => {
    const q = request.query;
    if (q.includes('STATS total')) {
      return countResponse(responses.detections.length);
    }
    // Membership semijoin filters on `processed_by`.
    if (q.includes('processed_by')) {
      return markerResponse(responses.processedIds);
    }
    return sourceResponse(responses.detections);
  });

  const esClient = { esql: { query } } as never;

  return {
    client: new DetectionClient({
      dataStreamClient: {} as never,
      esClient,
      space: 'default',
    }),
    query,
  };
};

const queriesFrom = (query: jest.Mock): string[] =>
  query.mock.calls.map((c) => (c[0] as { query: string }).query);

describe('DetectionClient', () => {
  describe('findLatest', () => {
    it('filters detections by change_point_type IS NOT NULL (excludes marker docs)', async () => {
      const { client, query } = createClient({
        detections: [
          createDetection({ '@timestamp': '2026-01-02T00:00:00.000Z', detection_id: 'f-1' }),
        ],
        processedIds: [],
      });

      await client.findLatest();

      const dataQuery = queriesFrom(query).find(
        (q) => !q.includes('STATS total') && !q.includes('processed_by')
      );
      expect(dataQuery).toContain('change_point_type IS NOT NULL');
    });

    it('groups by rule_uuid, not detection_id', async () => {
      const { client, query } = createClient({
        detections: [
          createDetection({ '@timestamp': '2026-01-02T00:00:00.000Z', detection_id: 'f-1' }),
        ],
        processedIds: [],
      });

      await client.findLatest();

      const dataQuery = queriesFrom(query).find(
        (q) => !q.includes('STATS total') && !q.includes('processed_by')
      );
      expect(dataQuery).toContain('rule_uuid');
      expect(dataQuery).not.toContain('BY detection_id');
    });

    it('derives processed=true only for detections whose id has a marker', async () => {
      const { client } = createClient({
        detections: [
          createDetection({
            '@timestamp': '2026-01-02T00:00:00.000Z',
            detection_id: 'f-1',
            rule_uuid: 'rule-1',
          }),
          createDetection({
            '@timestamp': '2026-01-02T00:00:00.000Z',
            detection_id: 'f-2',
            rule_uuid: 'rule-2',
          }),
        ],
        processedIds: ['f-1'],
      });

      const result = await client.findLatest();

      const byId = new Map(result.hits.map((h) => [h.detection_id, h.processed]));
      expect(byId.get('f-1')).toBe(true);
      expect(byId.get('f-2')).toBe(false);
    });

    it('returns a rule whose latest detection is a stationary (settlement) detection', async () => {
      const { client } = createClient({
        detections: [
          createDetection({
            '@timestamp': '2026-01-03T00:00:00.000Z',
            detection_id: 'rule-1-exec-9',
            rule_uuid: 'rule-1',
            change_point_type: 'stationary',
          }),
        ],
        processedIds: [],
      });

      const result = await client.findLatest();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].change_point_type).toBe('stationary');
      expect(result.hits[0].processed).toBe(false);
    });
  });

  describe('findById', () => {
    it('filters out marker docs via change_point_type IS NOT NULL', async () => {
      const { client, query } = createClient({
        detections: [
          createDetection({ '@timestamp': '2026-01-02T00:00:00.000Z', detection_id: 'f-1' }),
        ],
        processedIds: [],
      });

      await client.findById('f-1');

      const dataQuery = queriesFrom(query).find((q) => !q.includes('processed_by'));
      expect(dataQuery).toContain('change_point_type IS NOT NULL');
    });

    it('derives processed from marker membership', async () => {
      const { client } = createClient({
        detections: [
          createDetection({ '@timestamp': '2026-01-02T00:00:00.000Z', detection_id: 'f-1' }),
        ],
        processedIds: ['f-1'],
      });

      const result = await client.findById('f-1');

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].processed).toBe(true);
    });
  });
});

describe('DetectionClient.bulkCreate', () => {
  const createWriteClient = (items: BulkResponse['items']) => {
    const create = jest.fn(
      async (): Promise<BulkResponse> => ({ errors: items.length > 0, items, took: 1 })
    );
    const client = new DetectionClient({
      dataStreamClient: { create },
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      space: 'space-a',
    });
    return { client, create };
  };

  it('writes every document in the client space through the data stream client', async () => {
    const { client, create } = createWriteClient([]);
    const documents = [
      { '@timestamp': '2026-01-01T00:00:00.000Z', rule_uuid: 'rule-1', scanned_by: 'exec-1' },
      { '@timestamp': '2026-01-01T00:00:00.000Z', detection_id: 'd-1', processed_by: 'exec-1' },
    ];

    await client.bulkCreate(documents);

    expect(create).toHaveBeenCalledWith({ space: 'space-a', documents });
  });

  it('skips the request when there is nothing to write', async () => {
    const { client, create } = createWriteClient([]);

    await client.bulkCreate([]);

    expect(create).not.toHaveBeenCalled();
  });

  it('throws when Elasticsearch rejects a document', async () => {
    const { client } = createWriteClient([
      { create: { _index: '.significant_events-detections', status: 403, error: { type: 'x' } } },
    ]);

    await expect(
      client.bulkCreate([{ '@timestamp': '2026-01-01T00:00:00.000Z', rule_uuid: 'rule-1' }])
    ).rejects.toThrow('Bulk create operation failed for 1 out of 1 items');
  });
});

describe('DetectionClient.markSourceDetectionsProcessed', () => {
  const createSweepClient = ({
    detections,
    processedIds = [],
  }: {
    detections: Array<Record<string, unknown>>;
    processedIds?: string[];
  }) => {
    const query = jest.fn(async (request: { query: string }) => {
      if (request.query.includes('STATS total')) {
        return countResponse(detections.length);
      }
      if (request.query.includes('processed_by')) {
        return markerResponse(processedIds);
      }
      return sourceResponse(detections);
    });
    const create = jest.fn(
      async (): Promise<BulkResponse> => ({ errors: false, items: [], took: 1 })
    );
    const client = new DetectionClient({
      dataStreamClient: { create },
      esClient: { esql: { query } } as never,
      space: 'default',
    });
    return { client, create };
  };

  it('marks only the unprocessed detections of the deleted source', async () => {
    const { client, create } = createSweepClient({
      detections: [
        createDetection({
          '@timestamp': '2026-01-01T00:00:00.000Z',
          detection_id: 'd-gone',
          source_id: 'gone',
        }),
        createDetection({
          '@timestamp': '2026-01-01T00:00:00.000Z',
          detection_id: 'd-live',
          source_id: 'live',
        }),
        createDetection({
          '@timestamp': '2026-01-01T00:00:00.000Z',
          detection_id: 'd-done',
          source_id: 'gone',
        }),
      ],
      processedIds: ['d-done'],
    });

    await expect(
      client.markSourceDetectionsProcessed({ sourceId: 'gone', processedBy: 'source-deleted' })
    ).resolves.toBe(1);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      space: 'default',
      documents: [
        expect.objectContaining({ detection_id: 'd-gone', processed_by: 'source-deleted' }),
      ],
    });
  });

  it('writes nothing when the source has no unprocessed detections', async () => {
    const { client, create } = createSweepClient({
      detections: [
        createDetection({
          '@timestamp': '2026-01-01T00:00:00.000Z',
          detection_id: 'd-live',
          source_id: 'live',
        }),
      ],
    });

    await expect(
      client.markSourceDetectionsProcessed({ sourceId: 'gone', processedBy: 'source-deleted' })
    ).resolves.toBe(0);

    expect(create).not.toHaveBeenCalled();
  });
});
