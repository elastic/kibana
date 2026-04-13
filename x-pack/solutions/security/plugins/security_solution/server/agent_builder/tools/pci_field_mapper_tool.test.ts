/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { pciFieldMapperTool, PCI_FIELD_MAPPER_TOOL_ID } from './pci_field_mapper_tool';

describe('pciFieldMapperTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciFieldMapperTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('accepts valid index pattern', () => {
      const result = tool.schema.safeParse({ indexPattern: 'logs-custom-myapp*' });
      expect(result.success).toBe(true);
    });

    it('rejects missing index pattern', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('properties', () => {
    it('returns correct id', () => {
      expect(tool.id).toBe(PCI_FIELD_MAPPER_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('maps non-ECS fields to ECS equivalents using word-boundary matching', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
        fields: {
          username: { keyword: { type: 'keyword' } },
          src_ip: { ip: { type: 'ip' } },
          result: { keyword: { type: 'keyword' } },
          hostname: { keyword: { type: 'keyword' } },
          '@timestamp': { date: { type: 'date' } },
        },
      } as never);

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            { _source: { username: 'admin', src_ip: '10.0.0.1' } },
          ],
        },
      } as never);

      const result = (await tool.handler(
        { indexPattern: 'logs-custom*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results[0].data as {
        suggestedMappings: Array<{
          sourceField: string;
          suggestedEcsField: string;
          confidence: number;
        }>;
        ecsCoveragePercent: number;
      };

      expect(payload.suggestedMappings.length).toBeGreaterThan(0);

      const userNameMapping = payload.suggestedMappings.find(
        (m) => m.sourceField === 'username'
      );
      expect(userNameMapping?.suggestedEcsField).toBe('user.name');
      expect(userNameMapping?.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('redacts sensitive fields from mapping suggestions', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
        fields: {
          card_number: { keyword: { type: 'keyword' } },
          cvv: { keyword: { type: 'keyword' } },
          username: { keyword: { type: 'keyword' } },
          password_hash: { keyword: { type: 'keyword' } },
          '@timestamp': { date: { type: 'date' } },
        },
      } as never);

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      const result = (await tool.handler(
        { indexPattern: 'logs-payments*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results[0].data as {
        suggestedMappings: Array<{ sourceField: string }>;
      };

      const sensitiveFields = payload.suggestedMappings.filter(
        (m) =>
          m.sourceField === 'card_number' ||
          m.sourceField === 'cvv' ||
          m.sourceField === 'password_hash'
      );
      expect(sensitiveFields).toHaveLength(0);
    });

    it('returns error when fieldCaps fails', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('index_not_found'));

      const result = (await tool.handler(
        { indexPattern: 'nonexistent-*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('calculates ECS coverage correctly', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
        fields: {
          'user.name': { keyword: { type: 'keyword' } },
          'event.action': { keyword: { type: 'keyword' } },
          'event.category': { keyword: { type: 'keyword' } },
          '@timestamp': { date: { type: 'date' } },
        },
      } as never);

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      const result = (await tool.handler(
        { indexPattern: 'logs-*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results[0].data as { ecsCoveragePercent: number };
      expect(payload.ecsCoveragePercent).toBeGreaterThan(0);
      expect(payload.ecsCoveragePercent).toBeLessThanOrEqual(100);
    });

    it('avoids false positive matches for similar field names', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
        fields: {
          user_agent: { keyword: { type: 'keyword' } },
          user_type: { keyword: { type: 'keyword' } },
          '@timestamp': { date: { type: 'date' } },
        },
      } as never);

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      const result = (await tool.handler(
        { indexPattern: 'logs-*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results[0].data as {
        suggestedMappings: Array<{ sourceField: string; suggestedEcsField: string }>;
      };

      const userNameMappings = payload.suggestedMappings.filter(
        (m) => m.suggestedEcsField === 'user.name'
      );
      expect(userNameMappings).toHaveLength(0);
    });
  });
});
