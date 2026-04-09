/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { alertAnalysisSkill } from './alert_analysis_skill';

interface ResultData {
  message?: string;
  relatedAlerts?: Array<Record<string, unknown>>;
  sourceEntities?: {
    hostNames: string[];
    userNames: string[];
    sourceIps: string[];
    destIps: string[];
  };
}

const getData = (result: ToolHandlerStandardReturn, idx = 0): ResultData =>
  result.results[idx].data as unknown as ResultData;

describe('alertAnalysisSkill', () => {
  describe('skill definition', () => {
    it('has correct metadata', () => {
      expect(alertAnalysisSkill.id).toBe('alert-analysis');
      expect(alertAnalysisSkill.name).toBe('alert-analysis');
      expect(alertAnalysisSkill.basePath).toBe('skills/security/alerts');
      expect(alertAnalysisSkill.description).toContain('Alert triage');
    });

    it('returns expected registry tool IDs', () => {
      const tools = alertAnalysisSkill.getRegistryTools?.();
      expect(tools).toBeDefined();
      expect(tools).toHaveLength(3);
    });

    it('returns one inline tool', async () => {
      const inlineTools = await alertAnalysisSkill.getInlineTools?.();
      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(1);
      expect(inlineTools![0].id).toBe('security.alert-analysis.get-related-alerts');
    });
  });

  describe('get-related-alerts inline tool handler', () => {
    const { mockEsClient, mockRequest, mockLogger } = createToolTestMocks();

    let tool: BuiltinSkillBoundedTool;

    beforeEach(async () => {
      jest.clearAllMocks();
      const inlineTools = await alertAnalysisSkill.getInlineTools?.();
      tool = inlineTools![0] as BuiltinSkillBoundedTool;
    });

    const callHandler = async (
      params: {
        alertId: string;
        timeWindowHours?: number;
        hostNames?: string[];
        userNames?: string[];
        sourceIps?: string[];
        destIps?: string[];
      },
      spaceId = 'default'
    ) => {
      return tool.handler(
        params,
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId })
      ) as Promise<ToolHandlerStandardReturn>;
    };

    const mockGetResponse = (source: Record<string, unknown> | undefined) => {
      mockEsClient.asCurrentUser.get.mockResponseOnce({
        _id: 'alert-123',
        _index: '.alerts-security.alerts-default',
        found: true,
        _source: source,
      } as ReturnType<typeof mockEsClient.asCurrentUser.get> extends Promise<infer R> ? R : never);
    };

    const mockSearchResponse = (
      hits: Array<{ _id: string; _index: string; _source: Record<string, unknown> }> = []
    ) => {
      mockEsClient.asCurrentUser.search.mockResponseOnce({
        hits: { hits },
      } as ReturnType<typeof mockEsClient.asCurrentUser.search> extends Promise<infer R> ? R : never);
    };

    it('returns error when alert is not found', async () => {
      mockGetResponse(undefined);

      const result = await callHandler({ alertId: 'alert-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(getData(result).message).toContain('not found or has no source data');
    });

    it('returns empty when alert has no entity values', async () => {
      mockGetResponse({ 'kibana.alert.rule.name': 'Test Rule' });

      const result = await callHandler({ alertId: 'alert-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(getData(result).message).toContain('No entity values found');
      expect(getData(result).relatedAlerts).toEqual([]);
    });

    it('builds correct query with host.name entity', async () => {
      mockGetResponse({ host: { name: 'host-1' } });
      mockSearchResponse([
        {
          _id: 'related-1',
          _index: '.alerts-security.alerts-default',
          _source: { 'kibana.alert.rule.name': 'Related Rule' },
        },
      ]);

      const result = await callHandler({ alertId: 'alert-123', timeWindowHours: 48 });

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-default',
          query: expect.objectContaining({
            bool: expect.objectContaining({
              should: [{ terms: { 'host.name': ['host-1'] } }],
              minimum_should_match: 1,
              must_not: [{ ids: { values: ['alert-123'] } }],
              must: [{ range: { '@timestamp': { gte: 'now-48h' } } }],
            }),
          }),
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(getData(result).relatedAlerts).toHaveLength(1);
      expect(getData(result).sourceEntities?.hostNames).toEqual(['host-1']);
    });

    it('builds query with multiple entity types', async () => {
      mockGetResponse({
        host: { name: 'host-1' },
        user: { name: 'admin' },
        source: { ip: '10.0.0.1' },
        destination: { ip: '192.168.1.1' },
      });
      mockSearchResponse();

      const result = await callHandler({ alertId: 'alert-123' });

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as Record<string, Record<string, unknown>>;
      expect(query.bool.should).toEqual([
        { terms: { 'host.name': ['host-1'] } },
        { terms: { 'user.name': ['admin'] } },
        { terms: { 'source.ip': ['10.0.0.1'] } },
        { terms: { 'destination.ip': ['192.168.1.1'] } },
      ]);

      expect(getData(result).sourceEntities).toEqual({
        hostNames: ['host-1'],
        userNames: ['admin'],
        sourceIps: ['10.0.0.1'],
        destIps: ['192.168.1.1'],
      });
    });

    it('uses correct space-scoped alerts index', async () => {
      mockEsClient.asCurrentUser.get.mockResponseOnce({
        _id: 'alert-1',
        _index: '.alerts-security.alerts-custom',
        found: true,
        _source: { host: { name: 'h1' } },
      } as ReturnType<typeof mockEsClient.asCurrentUser.get> extends Promise<infer R> ? R : never);

      mockSearchResponse();

      await callHandler({ alertId: 'alert-1' }, 'custom');

      expect(mockEsClient.asCurrentUser.get).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.alerts-security.alerts-custom' })
      );
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.alerts-security.alerts-custom' })
      );
    });

    it('handles multi-valued entity fields (arrays)', async () => {
      mockGetResponse({ host: { name: ['host-a', 'host-b'] } });
      mockSearchResponse();

      const result = await callHandler({ alertId: 'alert-123' });

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as Record<string, Record<string, unknown>>;
      expect(query.bool.should).toEqual([{ terms: { 'host.name': ['host-a', 'host-b'] } }]);
      expect(getData(result).sourceEntities?.hostNames).toEqual(['host-a', 'host-b']);
    });

    it('skips GET when entity fields are provided', async () => {
      mockSearchResponse([
        {
          _id: 'related-1',
          _index: '.alerts-security.alerts-default',
          _source: { 'kibana.alert.rule.name': 'Related Rule' },
        },
      ]);

      const result = await callHandler({
        alertId: 'alert-123',
        hostNames: ['host-1'],
        userNames: ['admin'],
      });

      expect(mockEsClient.asCurrentUser.get).not.toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledTimes(1);

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const query = searchCall.query as Record<string, Record<string, unknown>>;
      expect(query.bool.should).toEqual([
        { terms: { 'host.name': ['host-1'] } },
        { terms: { 'user.name': ['admin'] } },
      ]);

      expect(result.results).toHaveLength(1);
      expect(getData(result).relatedAlerts).toHaveLength(1);
      expect(getData(result).sourceEntities).toEqual({
        hostNames: ['host-1'],
        userNames: ['admin'],
        sourceIps: [],
        destIps: [],
      });
    });

    it('falls back to GET when no entity fields are provided', async () => {
      mockGetResponse({ host: { name: 'host-1' } });
      mockSearchResponse();

      await callHandler({ alertId: 'alert-123' });

      expect(mockEsClient.asCurrentUser.get).toHaveBeenCalledTimes(1);
    });

    it('returns error result when ES get throws', async () => {
      mockEsClient.asCurrentUser.get.mockRejectedValueOnce(new Error('ES connection failed'));

      const result = await callHandler({ alertId: 'alert-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(getData(result).message).toContain('ES connection failed');
    });

    it('returns error result when ES search throws', async () => {
      mockGetResponse({ host: { name: 'host-1' } });
      mockEsClient.asCurrentUser.search.mockRejectedValueOnce(new Error('Search timeout'));

      const result = await callHandler({ alertId: 'alert-123' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(getData(result).message).toContain('Search timeout');
    });
  });
});
