/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMitreMapperAgent, generateAttackNavigatorLayer } from './mitre_mapper_agent';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Alert, TriageResult, MitreMapping } from '../types';

const mockLlmClient = {
  invoke: jest.fn(),
} as unknown as ActionsClientLlm;

const mockAlert: Alert = {
  _id: 'alert-123',
  _index: '.alerts-security.alerts-default',
  _source: {
    '@timestamp': '2026-03-22T10:00:00Z',
    'kibana.alert.rule.name': 'PowerShell Execution',
    'process.name': 'powershell.exe',
    'process.command_line': 'powershell.exe -enc [base64]',
    'event.category': ['process'],
    'event.type': ['start'],
  },
};

const mockTriageResult: TriageResult = {
  classification: 'HIGH',
  attackType: 'Lateral Movement',
  confidence: 85,
  reasoning: 'Suspicious lateral movement',
};

describe('createMitreMapperAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create agent with correct configuration', () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    expect(agent.name).toBe('mitre-mapper-agent');
    expect(agent.systemPrompt).toContain('MITRE ATT&CK expert');
  });

  it('should execute MITRE mapping successfully', async () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        techniques: [
          { id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' },
          { id: 'T1021.002', name: 'SMB/Windows Admin Shares', confidence: 'MEDIUM' },
        ],
        tactics: [
          { id: 'TA0002', name: 'Execution' },
          { id: 'TA0008', name: 'Lateral Movement' },
        ],
        phase: 'Lateral Movement',
        confidence: 'HIGH',
        reasoning: 'PowerShell with remote service access',
      }),
    });

    const result = await agent.execute(mockAlert);

    expect(result.techniques).toHaveLength(2);
    expect(result.techniques[0].id).toBe('T1059.001');
    expect(result.tactics).toHaveLength(2);
    expect(result.phase).toBe('Lateral Movement');
    expect(result.confidence).toBe('HIGH');
  });

  it('should include triage context when provided', async () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' }],
        tactics: [{ id: 'TA0002', name: 'Execution' }],
        phase: 'Execution',
        confidence: 'HIGH',
        reasoning: 'Based on triage classification',
      }),
    });

    await agent.execute(mockAlert, mockTriageResult);

    expect(mockLlmClient.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Triage Classification'),
        }),
      ])
    );
  });

  it('should parse JSON from markdown code blocks', async () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: '```json\n{"techniques":[{"id":"T1486","name":"Data Encrypted for Impact","confidence":"HIGH"}],"tactics":[{"id":"TA0040","name":"Impact"}],"phase":"Impact","confidence":"HIGH","reasoning":"Ransomware"}\n```',
    });

    const result = await agent.execute(mockAlert);

    expect(result.techniques).toHaveLength(1);
    expect(result.techniques[0].id).toBe('T1486');
    expect(result.phase).toBe('Impact');
  });

  it('should throw error if response has no JSON', async () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: 'No JSON in this response',
    });

    await expect(agent.execute(mockAlert)).rejects.toThrow(
      'Failed to parse MITRE mapping response'
    );
  });

  it('should throw error if response structure is invalid', async () => {
    const agent = createMitreMapperAgent(mockLlmClient);

    (mockLlmClient.invoke as jest.Mock).mockResolvedValue({
      content: JSON.stringify({ invalid: 'structure' }),
    });

    await expect(agent.execute(mockAlert)).rejects.toThrow(
      'Invalid MITRE mapping response structure'
    );
  });
});

describe('generateAttackNavigatorLayer', () => {
  it('should generate valid ATT&CK Navigator layer JSON', () => {
    const mapping: MitreMapping = {
      techniques: [
        { id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' },
        { id: 'T1021.002', name: 'SMB', confidence: 'MEDIUM' },
        { id: 'T1003', name: 'Credential Dumping', confidence: 'LOW' },
      ],
      tactics: [{ id: 'TA0002', name: 'Execution' }],
      phase: 'Execution',
      confidence: 'HIGH',
      reasoning: 'Multi-technique attack',
    };

    const layer = generateAttackNavigatorLayer('alert-123', mapping);

    expect(layer.name).toBe('Alert alert-123 - Execution');
    expect(layer.versions).toEqual({
      attack: '14',
      navigator: '5.1.0',
    });
    expect(layer.domain).toBe('enterprise-attack');
    expect(layer.description).toBe('Multi-technique attack');

    const techniques = layer.techniques as any[];
    expect(techniques).toHaveLength(3);

    // High confidence = score 100
    expect(techniques[0].score).toBe(100);
    expect(techniques[0].techniqueID).toBe('T1059.001');

    // Medium confidence = score 50
    expect(techniques[1].score).toBe(50);
    expect(techniques[1].techniqueID).toBe('T1021.002');

    // Low confidence = score 25
    expect(techniques[2].score).toBe(25);
    expect(techniques[2].techniqueID).toBe('T1003');
  });

  it('should handle empty techniques list', () => {
    const mapping: MitreMapping = {
      techniques: [],
      tactics: [],
      phase: 'Unknown',
      confidence: 'LOW',
      reasoning: 'Insufficient information',
    };

    const layer = generateAttackNavigatorLayer('alert-456', mapping);

    expect(layer.techniques).toEqual([]);
  });
});
