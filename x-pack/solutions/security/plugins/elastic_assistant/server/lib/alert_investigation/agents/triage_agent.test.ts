/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTriageAgent } from './triage_agent';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Alert } from '../types';

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

const mockLlmClient = {
  invoke: jest.fn(),
  bindTools: jest.fn().mockReturnThis(),
} as unknown as ActionsClientLlm;

const mockAlert: Alert = {
  _id: 'alert-123',
  _index: '.alerts-security.alerts-default',
  _source: {
    '@timestamp': '2026-03-22T10:00:00Z',
    'kibana.alert.rule.name': 'Suspicious Activity',
    'kibana.alert.severity': 'high',
    'process.name': 'cmd.exe',
    'user.name': 'admin',
    'host.name': 'SERVER-01',
  },
};

describe('createTriageAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create agent with correct configuration', () => {
    const agent = createTriageAgent(mockLlmClient, mockEsClient);

    expect(agent.name).toBe('triage-agent');
    expect(agent.systemPrompt).toContain('expert security analyst');
    expect(agent.tools).toHaveLength(1);
    expect(agent.tools[0].name).toBe('query_similar_alerts');
  });

  it('should execute triage successfully with valid LLM response', async () => {
    const agent = createTriageAgent(mockLlmClient, mockEsClient);

    // Mock ES search
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    // Mock LLM response
    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        classification: 'HIGH',
        attackType: 'Lateral Movement',
        confidence: 85,
        reasoning: 'Command execution on remote host',
      }),
    });

    const result = await agent.execute(mockAlert);

    expect(result.classification).toBe('HIGH');
    expect(result.attackType).toBe('Lateral Movement');
    expect(result.confidence).toBe(85);
    expect(result.reasoning).toContain('Command execution');
  });

  it('should parse JSON from markdown code blocks', async () => {
    const agent = createTriageAgent(mockLlmClient, mockEsClient);

    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    // LLM returns JSON wrapped in markdown
    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: '```json\n{"classification":"CRITICAL","attackType":"Malware","confidence":95,"reasoning":"Ransomware detected"}\n```',
    });

    const result = await agent.execute(mockAlert);

    expect(result.classification).toBe('CRITICAL');
    expect(result.attackType).toBe('Malware');
    expect(result.confidence).toBe(95);
  });

  it('should throw error if LLM response is invalid', async () => {
    const agent = createTriageAgent(mockLlmClient, mockEsClient);

    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: 'Invalid response without JSON',
    });

    await expect(agent.execute(mockAlert)).rejects.toThrow(
      'Failed to parse triage response'
    );
  });

  it('should throw error if JSON structure is invalid', async () => {
    const agent = createTriageAgent(mockLlmClient, mockEsClient);

    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: JSON.stringify({ invalid: 'structure' }),
    });

    await expect(agent.execute(mockAlert)).rejects.toThrow(
      'Invalid triage response structure'
    );
  });

  describe('query_similar_alerts tool', () => {
    it('should query ES for similar alerts by IP', async () => {
      const agent = createTriageAgent(mockLlmClient, mockEsClient);
      const tool = agent.tools[0];

      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2026-03-22T09:00:00Z',
                'source.ip': '192.168.1.100',
                'kibana.alert.severity': 'high',
              },
            },
          ],
        },
      });

      const result = await tool.func({
        entityValue: '192.168.1.100',
        entityType: 'ip',
        limit: 10,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-*',
          body: expect.objectContaining({
            query: {
              bool: {
                should: [
                  { term: { 'source.ip': '192.168.1.100' } },
                  { term: { 'destination.ip': '192.168.1.100' } },
                ],
                minimum_should_match: 1,
              },
            },
            size: 10,
          }),
        })
      );

      const parsed = JSON.parse(result as string);
      expect(parsed.count).toBe(1);
      expect(parsed.alerts).toHaveLength(1);
    });

    it('should query ES for similar alerts by user', async () => {
      const agent = createTriageAgent(mockLlmClient, mockEsClient);
      const tool = agent.tools[0];

      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });

      await tool.func({
        entityValue: 'admin',
        entityType: 'user',
        limit: 5,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: {
              bool: {
                should: [{ term: { 'user.name': 'admin' } }],
                minimum_should_match: 1,
              },
            },
            size: 5,
          }),
        })
      );
    });

    it('should handle ES errors gracefully', async () => {
      const agent = createTriageAgent(mockLlmClient, mockEsClient);
      const tool = agent.tools[0];

      (mockEsClient.search as jest.Mock).mockRejectedValue(
        new Error('ES connection timeout')
      );

      const result = await tool.func({
        entityValue: 'test',
        entityType: 'host',
        limit: 10,
      });

      const parsed = JSON.parse(result as string);
      expect(parsed.error).toContain('Failed to query alerts');
      expect(parsed.error).toContain('ES connection timeout');
    });
  });
});
