/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Readable } from 'stream';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { createEventIngestedPipeline } from '../utils/event_ingested_pipeline';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { AssetCriticalityUpsert } from '../../../../common/entity_analytics/asset_criticality/types';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { CRITICALITY_VALUES } from './constants';

type MockInternalEsClient = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>['asInternalUser'];
jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));
jest.mock('../utils/event_ingested_pipeline', () => ({
  createEventIngestedPipeline: jest.fn(),
  getIngestPipelineName: jest.fn(
    (namespace) => `entity_analytics_create_eventIngest_from_timestamp-pipeline-${namespace}`
  ),
}));

describe('AssetCriticalityDataClient', () => {
  const esClientInternal = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const logger = loggingSystemMock.createLogger();
  const mockAuditLogger = auditLoggerMock.create();

  describe('init', () => {
    it('ensures the index is available and up to date', async () => {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient: esClientInternal,
        logger,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });

      await assetCriticalityDataClient.init();

      expect(createEventIngestedPipeline).toHaveBeenCalledWith(esClientInternal, 'default');
      expect(createOrUpdateIndex).toHaveBeenCalledWith({
        esClient: esClientInternal,
        logger,
        options: {
          index: '.asset-criticality.asset-criticality-default',
          mappings: {
            _meta: {
              version: 4,
            },
            dynamic: 'strict',
            properties: {
              id_field: {
                type: 'keyword',
              },
              id_value: {
                type: 'keyword',
              },
              criticality_level: {
                type: 'keyword',
              },
              event: {
                properties: {
                  ingested: {
                    type: 'date',
                  },
                },
              },
              '@timestamp': {
                type: 'date',
                ignore_malformed: false,
              },
              updated_at: {
                type: 'date',
              },
              asset: {
                properties: {
                  criticality: {
                    type: 'keyword',
                  },
                },
              },
              host: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              service: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              user: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              entity: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  id: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          settings: {
            default_pipeline: 'entity_analytics_create_eventIngest_from_timestamp-pipeline-default',
          },
        },
      });
    });
  });

  describe('#search()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('searches in the asset criticality index', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.asset-criticality.asset-criticality-default' })
      );
    });

    // QUESTION: This test seems useless?
    it('requires a query parameter', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: { match_all: {} } })
      );
    });

    it('accepts a from parameter', async () => {
      await subject.search({ query: { match_all: {} }, from: 100 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ from: 100 }));
    });

    it('accepts a sort parameter', async () => {
      await subject.search({ query: { match_all: {} }, sort: [{ '@timestamp': 'asc' }] });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: [{ '@timestamp': 'asc' }] })
      );
    });

    it('accepts a size parameter', async () => {
      await subject.search({ query: { match_all: {} }, size: 100 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
    });

    it('defaults to the default query size', async () => {
      await subject.search({ query: { match_all: {} } });
      const defaultSize = 1_000;

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: defaultSize })
      );
    });

    it('caps the size to the maximum query size', async () => {
      await subject.search({ query: { match_all: {} }, size: 999999 });
      const maxSize = 100_000;

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: maxSize }));
    });

    it('ignores an index_not_found_exception if the criticality index does not exist', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ ignore_unavailable: true })
      );
    });

    it('applies a post_filter to exclude deleted records', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          post_filter: {
            bool: {
              must_not: {
                term: { criticality_level: CRITICALITY_VALUES.DELETED },
              },
            },
          },
        })
      );
    });

    it('applies a default sort by @timestamp', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: ['@timestamp'] })
      );
    });
  });

  describe('#searchByKuery()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('converts kuery to elasticsearch query and calls search', async () => {
      await subject.searchByKuery({ kuery: 'criticality_level: "high_impact"' });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.any(Object),
          index: '.asset-criticality.asset-criticality-default',
        })
      );
    });

    it('uses match_all query when no kuery is provided', async () => {
      await subject.searchByKuery({});

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { match_all: {} },
        })
      );
    });

    it('passes through size, from, and sort parameters', async () => {
      await subject.searchByKuery({
        kuery: 'criticality_level: "high_impact"',
        size: 50,
        from: 10,
        sort: [{ '@timestamp': 'desc' }],
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 50,
          from: 10,
          sort: [{ '@timestamp': 'desc' }],
        })
      );
    });
  });

  describe('#upsert()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });

      // Mock the updateByQuery method for entity destination updates
      esClientMock.updateByQuery.mockResolvedValue({ total: 1, updated: 1, failures: [] });
    });

    it('created "host" records in the asset criticality index', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'host.name',
        idValue: 'host1',
        criticalityLevel: 'high_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'host.name:host1',
          index: '.asset-criticality.asset-criticality-default',
          doc: {
            id_field: 'host.name',
            id_value: 'host1',
            criticality_level: 'high_impact',
            '@timestamp': expect.any(String),
            asset: {
              criticality: 'high_impact',
            },
            host: {
              name: 'host1',
              asset: {
                criticality: 'high_impact',
              },
            },
          },
          doc_as_upsert: true,
        })
      );
    });

    it('created "user" records in the asset criticality index', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'user.name',
        idValue: 'user1',
        criticalityLevel: 'medium_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user.name:user1',
          index: '.asset-criticality.asset-criticality-default',
          doc: {
            id_field: 'user.name',
            id_value: 'user1',
            criticality_level: 'medium_impact',
            '@timestamp': expect.any(String),
            asset: {
              criticality: 'medium_impact',
            },
            user: {
              name: 'user1',
              asset: {
                criticality: 'medium_impact',
              },
            },
          },
          doc_as_upsert: true,
        })
      );
    });

    it('updates the entity destination index during upsert for host records', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'host.name',
        idValue: 'host1',
        criticalityLevel: 'high_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_host_default',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'host.name': 'host1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: 'high_impact' },
        },
      });
    });

    it('updates the entity destination index during upsert for user records', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'user.name',
        idValue: 'user1',
        criticalityLevel: 'medium_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_user_default',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'user.name': 'user1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: 'medium_impact' },
        },
      });
    });

    it('updates the entity destination index during upsert for service records', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'service.name',
        idValue: 'service1',
        criticalityLevel: 'low_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_service_default',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'service.name': 'service1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: 'low_impact' },
        },
      });
    });

    it('updates the entity destination index during upsert for generic records', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'entity.id',
        idValue: 'generic1',
        criticalityLevel: 'medium_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_generic_default',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'entity.id': 'generic1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: 'medium_impact' },
        },
      });
    });

    it('updates the entity destination index with a different namespace', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'host.name',
        idValue: 'host1',
        criticalityLevel: 'high_impact',
      };

      const subjectWithNamespace = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'other-namespace',
        auditLogger: mockAuditLogger,
      });

      await subjectWithNamespace.upsert(record);

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_host_other-namespace',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'host.name': 'host1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: 'high_impact' },
        },
      });
    });
  });

  describe('#bulkUpsertFromStream()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;

      esClientMock.helpers.bulk = mockEsBulk();
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('returns valid stats', async () => {
      const recordsStream = [
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
      ];

      const result = await subject.bulkUpsertFromStream({
        recordsStream: Readable.from(recordsStream),
        retries: 3,
        flushBytes: 1_000,
      });

      expect(result).toEqual({
        errors: [],
        stats: {
          failed: 0,
          successful: 1,
          total: 1,
        },
      });
    });

    it('returns error for duplicated entities', async () => {
      const recordsStream = [
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
      ];

      const result = await subject.bulkUpsertFromStream({
        recordsStream: Readable.from(recordsStream),
        retries: 3,
        flushBytes: 1_000,
        streamIndexStart: 9,
      });

      expect(result).toEqual({
        errors: [
          {
            index: 10,
            message: 'Duplicated entity',
          },
        ],
        stats: {
          failed: 1,
          successful: 1,
          total: 2,
        },
      });
    });

    it('returns valid stats for unassigned', async () => {
      const recordsStream = [
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'unassigned' },
      ];

      const result = await subject.bulkUpsertFromStream({
        recordsStream: Readable.from(recordsStream),
        retries: 3,
        flushBytes: 1_000,
      });

      expect(result).toEqual({
        errors: [],
        stats: {
          failed: 0,
          successful: 1,
          total: 1,
        },
      });
    });
  });

  describe('#get()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('returns undefined for deleted records', async () => {
      esClientMock.get.mockResolvedValue({
        _index: '.asset-criticality.asset-criticality-default',
        _id: 'host.name:host1',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
        found: true,
        _source: {
          id_field: 'host.name',
          id_value: 'host1',
          criticality_level: CRITICALITY_VALUES.DELETED,
          '@timestamp': new Date().toISOString(),
        },
      });

      const result = await subject.get({ idField: 'host.name', idValue: 'host1' });

      expect(result).toBeUndefined();
    });

    it('returns the record for non-deleted records', async () => {
      const mockRecord = {
        id_field: 'host.name',
        id_value: 'host1',
        criticality_level: 'high_impact',
        '@timestamp': new Date().toISOString(),
        asset: {
          criticality: 'high_impact',
        },
        host: {
          name: 'host1',
          asset: {
            criticality: 'high_impact',
          },
        },
      };

      esClientMock.get.mockResolvedValue({
        _index: '.asset-criticality.asset-criticality-default',
        _id: 'host.name:host1',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
        found: true,
        _source: mockRecord,
      });

      const result = await subject.get({ idField: 'host.name', idValue: 'host1' });

      expect(result).toEqual(mockRecord);
    });

    it('returns undefined for 404 errors', async () => {
      esClientMock.get.mockRejectedValue({ statusCode: 404 });

      const result = await subject.get({ idField: 'host.name', idValue: 'host1' });

      expect(result).toBeUndefined();
    });
  });

  describe('#delete()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });

      // Mock the updateByQuery method for entity destination updates
      esClientMock.updateByQuery.mockResolvedValue({
        took: 1,
        timed_out: false,
        total: 1,
        updated: 1,
        deleted: 0,
        batches: 1,
        version_conflicts: 0,
        noops: 0,
        retries: {
          bulk: 0,
          search: 0,
        },
        throttled_millis: 0,
        requests_per_second: -1,
        throttled_until_millis: 0,
        failures: [],
      });
    });

    it('marks records as deleted instead of physically deleting them', async () => {
      const existingRecord = {
        id_field: 'host.name',
        id_value: 'host1',
        criticality_level: 'high_impact',
        '@timestamp': new Date().toISOString(),
        asset: {
          criticality: 'high_impact',
        },
        host: {
          name: 'host1',
          asset: {
            criticality: 'high_impact',
          },
        },
      };

      esClientMock.get.mockResolvedValue({
        _index: '.asset-criticality.asset-criticality-default',
        _id: 'host.name:host1',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
        found: true,
        _source: existingRecord,
      });

      const result = await subject.delete({ idField: 'host.name', idValue: 'host1' });

      expect(esClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'host.name:host1',
          index: '.asset-criticality.asset-criticality-default',
          doc: expect.objectContaining({
            criticality_level: CRITICALITY_VALUES.DELETED,
            asset: {
              criticality: CRITICALITY_VALUES.DELETED,
            },
            '@timestamp': expect.any(String),
          }),
        })
      );

      expect(result).toEqual(existingRecord);
    });

    it('updates the entity destination index during delete', async () => {
      const existingRecord = {
        id_field: 'host.name',
        id_value: 'host1',
        criticality_level: 'high_impact',
        '@timestamp': new Date().toISOString(),
        asset: {
          criticality: 'high_impact',
        },
        host: {
          name: 'host1',
          asset: {
            criticality: 'high_impact',
          },
        },
      };

      esClientMock.get.mockResolvedValue({
        _index: '.asset-criticality.asset-criticality-default',
        _id: 'host.name:host1',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
        found: true,
        _source: existingRecord,
      });

      await subject.delete({ idField: 'host.name', idValue: 'host1' });

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_host_default',
        refresh: true,
        conflicts: 'proceed',
        query: { term: { 'host.name': 'host1' } },
        script: {
          source:
            'if (ctx._source.asset == null) { ctx._source.asset = [:]; } ctx._source.asset.criticality = params.level;',
          params: { level: CRITICALITY_VALUES.DELETED },
        },
      });
    });

    it('returns undefined if the record does not exist', async () => {
      esClientMock.get.mockRejectedValue({ statusCode: 404 });

      const result = await subject.delete({ idField: 'host.name', idValue: 'host1' });

      expect(result).toBeUndefined();
      expect(esClientMock.update).not.toHaveBeenCalled();
    });
  });
});

const mockEsBulk = () =>
  jest.fn().mockImplementation(async ({ datasource }) => {
    let count = 0;
    for await (const _ of datasource) {
      count++;
    }
    return {
      failed: 0,
      successful: count,
    };
  }) as unknown as ElasticsearchClientMock['helpers']['bulk'];
