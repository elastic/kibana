/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { pciScopeDiscoveryTool, PCI_SCOPE_DISCOVERY_TOOL_ID } from './pci_scope_discovery_tool';

describe('pciScopeDiscoveryTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciScopeDiscoveryTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('accepts default input', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts custom indices', () => {
      const result = tool.schema.safeParse({
        scopeType: 'network',
        customIndices: ['custom-firewall-*'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid scope type', () => {
      const result = tool.schema.safeParse({
        scopeType: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('properties', () => {
    it('returns correct id', () => {
      expect(tool.id).toBe(PCI_SCOPE_DISCOVERY_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('classifies indices by field and name hints', async () => {
      (mockEsClient.asCurrentUser.cat.indices as jest.Mock).mockResolvedValue([
        { index: 'packetbeat-network-*' },
        { index: 'custom-auth-*' },
      ]);

      (mockEsClient.asCurrentUser.fieldCaps as jest.Mock)
        .mockResolvedValueOnce({
          fields: {
            'event.category': {},
            'source.ip': {},
            'destination.ip': {},
          },
        })
        .mockResolvedValueOnce({
          fields: {
            'event.category': {},
            'user.name': {},
            'event.outcome': {},
          },
        });

      const result = await tool.handler(
        { scopeType: 'all' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0].data as { matchedIndices: number }).matchedIndices).toBe(2);
    });

    it('filters by requested scope type', async () => {
      (mockEsClient.asCurrentUser.cat.indices as jest.Mock).mockResolvedValue([
        { index: 'packetbeat-network-*' },
        { index: 'custom-auth-*' },
      ]);

      (mockEsClient.asCurrentUser.fieldCaps as jest.Mock)
        .mockResolvedValueOnce({ fields: { 'source.ip': {}, 'destination.ip': {} } })
        .mockResolvedValueOnce({ fields: { 'user.name': {}, 'event.outcome': {} } });

      const result = await tool.handler(
        { scopeType: 'network' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const data = result.results[0].data as {
        matchedIndices: number;
        discovered: Array<{ index: string }>;
      };
      expect(data.matchedIndices).toBe(1);
      expect(data.discovered[0].index).toContain('packetbeat-network');
    });
  });
});
