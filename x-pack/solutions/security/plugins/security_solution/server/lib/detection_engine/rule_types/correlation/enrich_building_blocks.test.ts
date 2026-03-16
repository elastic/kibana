/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  fetchContributingAlerts,
  extractEnrichmentFields,
  computeShellEnrichment,
} from './enrich_building_blocks';

const createMockEsClient = (
  mgetResponse: { docs: Array<Record<string, unknown>> } = { docs: [] }
): ElasticsearchClient => {
  return {
    mget: jest.fn().mockResolvedValue(mgetResponse),
  } as unknown as ElasticsearchClient;
};

describe('enrich_building_blocks', () => {
  describe('fetchContributingAlerts', () => {
    it('should return empty map when alertIds is empty', async () => {
      const esClient = createMockEsClient();
      const result = await fetchContributingAlerts(
        esClient,
        new Set<string>(),
        '.alerts-security.alerts-default'
      );

      expect(result.size).toBe(0);
      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('should fetch and return found documents', async () => {
      const esClient = createMockEsClient({
        docs: [
          {
            _id: 'alert-1',
            found: true,
            _source: {
              'host.name': 'host-a',
              'user.name': 'alice',
              'process.name': 'cmd.exe',
            },
          },
          {
            _id: 'alert-2',
            found: true,
            _source: {
              'host.name': 'host-b',
              'user.name': 'bob',
            },
          },
        ],
      });

      const result = await fetchContributingAlerts(
        esClient,
        new Set(['alert-1', 'alert-2']),
        '.alerts-security.alerts-default'
      );

      expect(result.size).toBe(2);
      expect(result.get('alert-1')).toEqual({
        'host.name': 'host-a',
        'user.name': 'alice',
        'process.name': 'cmd.exe',
      });
      expect(result.get('alert-2')).toEqual({
        'host.name': 'host-b',
        'user.name': 'bob',
      });

      expect(esClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-default',
          ids: ['alert-1', 'alert-2'],
        })
      );
    });

    it('should skip documents that are not found', async () => {
      const esClient = createMockEsClient({
        docs: [
          {
            _id: 'alert-1',
            found: true,
            _source: { 'host.name': 'host-a' },
          },
          {
            _id: 'alert-2',
            found: false,
          },
          {
            _id: 'alert-3',
            found: true,
            _source: { 'host.name': 'host-c' },
          },
        ],
      });

      const result = await fetchContributingAlerts(
        esClient,
        new Set(['alert-1', 'alert-2', 'alert-3']),
        '.alerts-security.alerts-default'
      );

      expect(result.size).toBe(2);
      expect(result.has('alert-1')).toBe(true);
      expect(result.has('alert-2')).toBe(false);
      expect(result.has('alert-3')).toBe(true);
    });

    it('should batch mget calls for more than 5000 IDs', async () => {
      const totalIds = 5003;
      const ids = Array.from({ length: totalIds }, (_, i) => `alert-${i}`);
      const firstBatchDocs = ids.slice(0, 5000).map((id) => ({
        _id: id,
        found: true,
        _source: { 'host.name': 'host-batch1' },
      }));
      const secondBatchDocs = ids.slice(5000).map((id) => ({
        _id: id,
        found: true,
        _source: { 'host.name': 'host-batch2' },
      }));

      const mgetMock = jest
        .fn()
        .mockResolvedValueOnce({ docs: firstBatchDocs })
        .mockResolvedValueOnce({ docs: secondBatchDocs });

      const esClient = { mget: mgetMock } as unknown as ElasticsearchClient;

      const result = await fetchContributingAlerts(
        esClient,
        new Set(ids),
        '.alerts-security.alerts-default'
      );

      expect(mgetMock).toHaveBeenCalledTimes(2);
      expect(mgetMock.mock.calls[0][0].ids).toHaveLength(5000);
      expect(mgetMock.mock.calls[1][0].ids).toHaveLength(3);
      expect(result.size).toBe(totalIds);
    });
  });

  describe('extractEnrichmentFields', () => {
    it('should extract flat ECS fields', async () => {
      const doc = {
        host: { name: 'host-1', ip: '10.0.0.1' },
        user: { name: 'alice' },
        process: { name: 'bash', pid: 1234 },
      };

      const result = extractEnrichmentFields(doc);

      expect(result).toEqual(
        expect.objectContaining({
          host: expect.objectContaining({ name: 'host-1', ip: '10.0.0.1' }),
          user: expect.objectContaining({ name: 'alice' }),
          process: expect.objectContaining({ name: 'bash', pid: 1234 }),
        })
      );
    });

    it('should extract deeply nested fields', async () => {
      const doc = {
        process: {
          parent: { name: 'init', executable: '/sbin/init' },
        },
        file: {
          hash: { sha256: 'abc123' },
        },
        dns: {
          question: { name: 'example.com' },
        },
        host: {
          os: { name: 'Windows' },
        },
      };

      const result = extractEnrichmentFields(doc);

      expect(result).toEqual(
        expect.objectContaining({
          process: { parent: { name: 'init', executable: '/sbin/init' } },
          file: { hash: { sha256: 'abc123' } },
          dns: { question: { name: 'example.com' } },
          host: { os: { name: 'Windows' } },
        })
      );
    });

    it('should omit fields that are missing from the document', async () => {
      const doc = {
        host: { name: 'host-1' },
      };

      const result = extractEnrichmentFields(doc);

      expect(result).toEqual({ host: { name: 'host-1' } });
      expect(result).not.toHaveProperty('user');
      expect(result).not.toHaveProperty('process');
      expect(result).not.toHaveProperty('source');
    });

    it('should return empty object for empty document', async () => {
      const result = extractEnrichmentFields({});
      expect(result).toEqual({});
    });

    it('should extract kibana alert fields', async () => {
      const doc = {
        kibana: {
          alert: {
            rule: { name: 'Test Rule' },
            severity: 'high',
            risk_score: 75,
            reason: 'Suspicious activity detected',
            original_time: '2026-01-01T00:00:00Z',
          },
        },
        '@timestamp': '2026-01-01T00:00:00Z',
      };

      const result = extractEnrichmentFields(doc);

      expect(result).toEqual(
        expect.objectContaining({
          kibana: expect.objectContaining({
            alert: expect.objectContaining({
              rule: { name: 'Test Rule' },
              severity: 'high',
              risk_score: 75,
              reason: 'Suspicious activity detected',
              original_time: '2026-01-01T00:00:00Z',
            }),
          }),
          '@timestamp': '2026-01-01T00:00:00Z',
        })
      );
    });
  });

  describe('computeShellEnrichment', () => {
    it('should return empty object for empty input', () => {
      const result = computeShellEnrichment([]);
      expect(result).toEqual({});
    });

    it('should return full enrichment for single document', () => {
      const doc = {
        host: { name: 'host-1' },
        user: { name: 'alice' },
      };

      const result = computeShellEnrichment([doc]);

      expect(result).toEqual(
        expect.objectContaining({
          host: expect.objectContaining({ name: 'host-1' }),
          user: expect.objectContaining({ name: 'alice' }),
        })
      );
    });

    it('should keep only fields with identical values across all documents', () => {
      const docs = [
        { host: { name: 'host-1' }, user: { name: 'alice' }, process: { name: 'bash' } },
        { host: { name: 'host-1' }, user: { name: 'bob' }, process: { name: 'bash' } },
        { host: { name: 'host-1' }, user: { name: 'charlie' }, process: { name: 'bash' } },
      ];

      const result = computeShellEnrichment(docs);

      expect(result).toEqual(
        expect.objectContaining({
          host: expect.objectContaining({ name: 'host-1' }),
          process: expect.objectContaining({ name: 'bash' }),
        })
      );
      expect(result).not.toHaveProperty('user');
    });

    it('should drop fields missing from any document', () => {
      const docs = [
        { host: { name: 'host-1' }, user: { name: 'alice' } },
        { host: { name: 'host-1' } },
      ];

      const result = computeShellEnrichment(docs);

      expect(result).toEqual(
        expect.objectContaining({
          host: expect.objectContaining({ name: 'host-1' }),
        })
      );
      expect(result).not.toHaveProperty('user');
    });

    it('should handle array field comparisons', () => {
      const docs = [
        { event: { category: ['process', 'network'] } },
        { event: { category: ['process', 'network'] } },
      ];

      const result = computeShellEnrichment(docs);

      expect(result).toEqual(
        expect.objectContaining({
          event: expect.objectContaining({ category: ['process', 'network'] }),
        })
      );
    });

    it('should drop array fields that differ', () => {
      const docs = [{ event: { category: ['process'] } }, { event: { category: ['network'] } }];

      const result = computeShellEnrichment(docs);

      expect(result).not.toHaveProperty('event');
    });
  });
});
