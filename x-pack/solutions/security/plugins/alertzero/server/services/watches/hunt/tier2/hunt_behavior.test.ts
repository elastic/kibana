/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { huntBehavior } from './hunt_behavior';
import {
  huntBehaviorLlmExtractionSchema,
  huntBehaviorEsqlGenerationSchema,
} from './extraction_contract';

const buildMockModel = (
  extractionResult: Partial<{
    candidates: Array<{ technique_id: string; evidence_quote: string; llm_confidence: number }>;
  }> = {}
): ScopedModel => {
  const withStructuredOutput = jest.fn().mockImplementation((schema) => {
    if (schema === huntBehaviorLlmExtractionSchema) {
      return {
        invoke: jest.fn().mockResolvedValue({ candidates: extractionResult.candidates ?? [] }),
      };
    }
    if (schema === huntBehaviorEsqlGenerationSchema) {
      return {
        invoke: jest.fn().mockResolvedValue({ rules: [] }),
      };
    }
    return { invoke: jest.fn().mockResolvedValue({}) };
  });

  return {
    chatModel: { withStructuredOutput } as unknown as ScopedModel['chatModel'],
    inferenceClient: {} as ScopedModel['inferenceClient'],
    connector: {} as ScopedModel['connector'],
  };
};

const logger = loggingSystemMock.createLogger();

describe('huntBehavior', () => {
  it('returns no_behaviors_found when LLM extracts nothing', async () => {
    const model = buildMockModel({ candidates: [] });
    const result = await huntBehavior(model, logger, { text: 'some report text' });
    expect(result.status).toBe('no_behaviors_found');
    expect(result.behaviors).toHaveLength(0);
    expect(result.hasHit).toBe(false);
  });

  it('drops candidates below the confidence threshold', async () => {
    const model = buildMockModel({
      candidates: [
        { technique_id: 'T1566', evidence_quote: 'phishing email', llm_confidence: 0.3 },
      ],
    });
    const result = await huntBehavior(model, logger, {
      text: 'report text',
      llm_confidence_threshold: 0.5,
    });
    expect(result.status).toBe('no_behaviors_found');
  });

  it('validates real technique IDs from the ATT&CK catalog', async () => {
    const model = buildMockModel({
      candidates: [
        { technique_id: 'T1566', evidence_quote: 'spear phishing used', llm_confidence: 0.9 },
        { technique_id: 'T9999999', evidence_quote: 'fictional', llm_confidence: 0.9 },
      ],
    });
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.status).toBe('behaviors_proposed');
    expect(result.behaviors).toHaveLength(1);
    expect(result.behaviors[0].technique_id).toBe('T1566');
    expect(result.dropped_unknown_ids).toContain('T9999999');
    expect(result.hasHit).toBe(false);
  });

  it('never sets hasHit to true (Tier 2 guarantee)', async () => {
    const model = buildMockModel({
      candidates: [
        { technique_id: 'T1059', evidence_quote: 'command-line execution', llm_confidence: 0.85 },
      ],
    });
    const result = await huntBehavior(model, logger, { text: 'report' });
    expect(result.hasHit).toBe(false);
  });

  it('produces indexed_behaviors with a technique_id and description', async () => {
    const model = buildMockModel({
      candidates: [
        { technique_id: 'T1566', evidence_quote: 'spear phishing', llm_confidence: 0.8 },
      ],
    });
    const result = await huntBehavior(model, logger, {
      text: 'report',
      report_id: 'rpt-001',
    });
    expect(result.indexed_behaviors).toHaveLength(1);
    expect(result.indexed_behaviors[0].technique_id).toBe('T1566');
    expect(result.indexed_behaviors[0].id).toBe('rpt-001:T1566');
  });
});
