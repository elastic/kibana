/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { pciScopeDiscoveryTool, PCI_SCOPE_DISCOVERY_TOOL_ID } from './pci_scope_discovery_tool';

describe('pciScopeDiscoveryTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciScopeDiscoveryTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('accepts the default input', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid custom indices', () => {
      const result = tool.schema.safeParse({
        scopeType: 'network',
        customIndices: ['custom-firewall-*'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid scope type', () => {
      const result = tool.schema.safeParse({ scopeType: 'invalid' });
      expect(result.success).toBe(false);
    });

    it.each(['custom-index"; DROP', 'bad\u0000index', 'line\nbreak', '../escape'])(
      'rejects malicious custom index %j',
      (bad) => {
        const result = tool.schema.safeParse({ customIndices: [bad] });
        expect(result.success).toBe(false);
      }
    );
  });

  describe('properties', () => {
    it('returns the expected tool id', () => {
      expect(tool.id).toBe(PCI_SCOPE_DISCOVERY_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('uses a single batched fieldCaps call across the discovered indices', async () => {
      (mockEsClient.asCurrentUser.cat.indices as unknown as jest.Mock).mockResolvedValue([
        { index: 'packetbeat-network-1' },
        { index: 'auth-logs-1' },
      ]);

      (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mockResolvedValue({
        fields: {
          'source.ip': { ip: { type: 'ip', indices: ['packetbeat-network-1'] } },
          'destination.ip': { ip: { type: 'ip', indices: ['packetbeat-network-1'] } },
          'user.name': { keyword: { type: 'keyword', indices: ['auth-logs-1'] } },
          'event.outcome': {
            keyword: { type: 'keyword', indices: ['auth-logs-1'] },
          },
          'event.category': { keyword: { type: 'keyword' } },
        },
      });

      const result = (await tool.handler(
        { scopeType: 'all' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(mockEsClient.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(1);
      const call = (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mock.calls[0][0];
      expect(call.index).toEqual(['packetbeat-network-1', 'auth-logs-1']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as {
        matchedIndices: number;
        discovered: Array<{ index: string; categories: string[] }>;
      };
      expect(data.matchedIndices).toBe(2);
    });

    it('filters results by requested scope type', async () => {
      (mockEsClient.asCurrentUser.cat.indices as unknown as jest.Mock).mockResolvedValue([
        { index: 'packetbeat-network-1' },
        { index: 'auth-logs-1' },
      ]);

      (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mockResolvedValue({
        fields: {
          'source.ip': { ip: { type: 'ip', indices: ['packetbeat-network-1'] } },
          'destination.ip': { ip: { type: 'ip', indices: ['packetbeat-network-1'] } },
          'user.name': { keyword: { type: 'keyword', indices: ['auth-logs-1'] } },
        },
      });

      const result = (await tool.handler(
        { scopeType: 'network' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        matchedIndices: number;
        discovered: Array<{ index: string }>;
      };
      expect(data.matchedIndices).toBe(1);
      expect(data.discovered[0].index).toBe('packetbeat-network-1');
    });

    it('resolves custom wildcard patterns to concrete indices via cat.indices', async () => {
      (mockEsClient.asCurrentUser.cat.indices as unknown as jest.Mock)
        // First call: initial index discovery (no pattern arg)
        .mockResolvedValueOnce([{ index: 'unrelated-index' }])
        // Second call: resolve the wildcard pattern
        .mockResolvedValueOnce([
          { index: 'custom-firewall-2024' },
          { index: 'custom-firewall-2025' },
        ]);

      (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mockResolvedValue({
        fields: {
          'source.ip': {
            ip: { type: 'ip', indices: ['custom-firewall-2024', 'custom-firewall-2025'] },
          },
          'destination.ip': {
            ip: { type: 'ip', indices: ['custom-firewall-2024', 'custom-firewall-2025'] },
          },
        },
      });

      const result = (await tool.handler(
        { scopeType: 'all', customIndices: ['custom-firewall-*'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      // cat.indices should have been called twice: once for initial discovery, once for the pattern
      expect(mockEsClient.asCurrentUser.cat.indices).toHaveBeenCalledTimes(2);
      expect(
        (mockEsClient.asCurrentUser.cat.indices as unknown as jest.Mock).mock.calls[1][0]
      ).toEqual(expect.objectContaining({ index: 'custom-firewall-*' }));

      const fieldCapsCall = (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mock
        .calls[0][0];
      expect(fieldCapsCall.index).not.toContain('custom-firewall-*');
      expect(fieldCapsCall.index).toContain('custom-firewall-2024');
      expect(fieldCapsCall.index).toContain('custom-firewall-2025');

      const data = result.results[0].data as {
        discovered: Array<{ index: string; ecsCoveragePercent: number }>;
      };
      const firewallIndices = data.discovered.filter((d) => d.index.startsWith('custom-firewall-'));
      expect(firewallIndices).toHaveLength(2);
      for (const idx of firewallIndices) {
        expect(idx.ecsCoveragePercent).toBeGreaterThan(0);
      }
    });

    it('attaches a scopeClaim with the PCI DSS version + disclaimer', async () => {
      (mockEsClient.asCurrentUser.cat.indices as unknown as jest.Mock).mockResolvedValue([
        { index: 'packetbeat-network-1' },
      ]);

      (mockEsClient.asCurrentUser.fieldCaps as unknown as jest.Mock).mockResolvedValue({
        fields: {
          'source.ip': { ip: { type: 'ip' } },
          'destination.ip': { ip: { type: 'ip' } },
        },
      });

      const result = (await tool.handler(
        { scopeType: 'all' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        scopeClaim: {
          pciDssVersion: string;
          disclaimer: string;
          requiredFieldsChecked: string[];
        };
      };

      expect(data.scopeClaim.pciDssVersion).toBe('4.0.1');
      expect(data.scopeClaim.disclaimer).toContain('Qualified Security Assessor');
      expect(data.scopeClaim.requiredFieldsChecked).toEqual(
        expect.arrayContaining(['source.ip', 'destination.ip'])
      );
    });
  });
});
