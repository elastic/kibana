/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { threatIntelEnrichTool } from './threat_intel_enrich_tool';

describe('threatIntelEnrichTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = threatIntelEnrichTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('validates correct IP lookup', () => {
      const validInput = {
        ioc_type: 'ip',
        ioc_value: '192.168.1.100',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct domain lookup', () => {
      const validInput = {
        ioc_type: 'domain',
        ioc_value: 'evil-domain.com',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct hash lookup', () => {
      const validInput = {
        ioc_type: 'hash',
        ioc_value: 'abc123def456abc123def456abc123de',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct URL lookup', () => {
      const validInput = {
        ioc_type: 'url',
        ioc_value: 'https://malicious-site.com/payload',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects unknown ioc_type', () => {
      const invalidInput = {
        ioc_type: 'email',
        ioc_value: 'attacker@evil.com',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing ioc_value', () => {
      const invalidInput = {
        ioc_type: 'ip',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty ioc_value', () => {
      const invalidInput = {
        ioc_type: 'ip',
        ioc_value: '',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('accepts optional sources', () => {
      const validInput = {
        ioc_type: 'ip',
        ioc_value: '1.2.3.4',
        sources: ['AbuseCH', 'AlienVault OTX'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates without sources', () => {
      const validInput = {
        ioc_type: 'domain',
        ioc_value: 'evil.com',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns matches when TI data is found for IP', async () => {
      const mockTiHit = {
        _id: 'ti-doc-1',
        _index: '.ds-logs-ti_abusech-default',
        _source: {
          '@timestamp': '2024-01-15T10:00:00Z',
          threat: {
            indicator: {
              type: 'ipv4-addr',
              ip: '1.2.3.4',
              provider: 'AbuseCH',
              confidence: 'High',
              description: 'Known C2 server',
              first_seen: '2024-01-01T00:00:00Z',
              last_seen: '2024-01-15T00:00:00Z',
            },
            feed: { name: 'AbuseCH' },
          },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [mockTiHit],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '1.2.3.4' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          ioc_type: 'ip',
          ioc_value: '1.2.3.4',
          match_count: 1,
          total_matches: 1,
        })
      );
      expect(result.results[0].data.matches).toHaveLength(1);
      expect(result.results[0].data.matches[0]).toEqual(
        expect.objectContaining({
          index: '.ds-logs-ti_abusech-default',
        })
      );
    });

    it('returns empty result when no matches found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '10.0.0.1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          ioc_type: 'ip',
          ioc_value: '10.0.0.1',
          match_count: 0,
          matches: [],
          message: expect.stringContaining('No threat intelligence found'),
        })
      );
    });

    it('builds correct query fields for IP IOC type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as never);

      await tool.handler(
        { ioc_type: 'ip', ioc_value: '1.2.3.4' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
      const shouldClause = query.bool.filter[0] as {
        bool: { should: Array<{ term: Record<string, string> }> };
      };
      const fields = shouldClause.bool.should.map((s) => Object.keys(s.term)[0]);
      expect(fields).toEqual(['threat.indicator.ip']);
    });

    it('builds correct query fields for domain IOC type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as never);

      await tool.handler(
        { ioc_type: 'domain', ioc_value: 'evil.com' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
      const shouldClause = query.bool.filter[0] as {
        bool: { should: Array<{ term: Record<string, string> }> };
      };
      const fields = shouldClause.bool.should.map((s) => Object.keys(s.term)[0]);
      expect(fields).toEqual(['threat.indicator.url.domain']);
    });

    it('builds correct query fields for hash IOC type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as never);

      await tool.handler(
        { ioc_type: 'hash', ioc_value: 'abc123' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
      const shouldClause = query.bool.filter[0] as {
        bool: { should: Array<{ term: Record<string, string> }> };
      };
      const fields = shouldClause.bool.should.map((s) => Object.keys(s.term)[0]);
      expect(fields).toEqual([
        'threat.indicator.file.hash.md5',
        'threat.indicator.file.hash.sha1',
        'threat.indicator.file.hash.sha256',
      ]);
    });

    it('builds correct query fields for URL IOC type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as never);

      await tool.handler(
        { ioc_type: 'url', ioc_value: 'https://evil.com/payload' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
      const shouldClause = query.bool.filter[0] as {
        bool: { should: Array<{ term: Record<string, string> }> };
      };
      const fields = shouldClause.bool.should.map((s) => Object.keys(s.term)[0]);
      expect(fields).toEqual(['threat.indicator.url.full']);
    });

    it('includes source filter when sources are provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as never);

      await tool.handler(
        { ioc_type: 'ip', ioc_value: '1.2.3.4', sources: ['AbuseCH'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as { bool: { filter: Array<Record<string, unknown>> } };
      expect(query.bool.filter).toHaveLength(2);
      expect(query.bool.filter[1]).toEqual({
        terms: { 'threat.indicator.provider': ['AbuseCH'] },
      });
    });

    it('handles ES errors', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('Search index not found'));

      const result = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '1.2.3.4' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Search index not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
