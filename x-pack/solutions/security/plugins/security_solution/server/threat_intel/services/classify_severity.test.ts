/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import {
  classifySeverity,
  toSeverityResult,
  type ClassifySeverityLlmOutput,
  classifySeverityLlmOutputSchema,
} from './classify_severity';

const buildModel = (
  output: ClassifySeverityLlmOutput | undefined
): { model: ScopedModel; invoke: jest.Mock } => {
  const invoke = jest.fn().mockResolvedValue({
    raw: { response_metadata: {} },
    parsed: output,
  });
  const structured = { invoke };
  const withStructuredOutput = jest.fn().mockReturnValue(structured);
  const chatModel = { withStructuredOutput } as unknown as ScopedModel['chatModel'];
  const connector = { connectorId: 'test-connector' } as ScopedModel['connector'];
  return { model: { chatModel, connector } as ScopedModel, invoke };
};

describe('classifySeverity', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns critical with score 90 for a critical-sounding classification', async () => {
    const { model } = buildModel({
      level: 'critical',
      rationale: 'Active ransomware with production outage',
    });
    const result = await classifySeverity(model, logger, {
      title: 'LockBit encrypts hospital EHR cluster',
      text: 'Ransomware operators encrypted production EHR systems overnight; patient care halted.',
    });
    expect(result).toEqual({
      level: 'critical',
      score: 90,
      rationale: 'Active ransomware with production outage',
    });
  });

  it('returns low with score 20 for a benign / commentary classification', async () => {
    const { model } = buildModel({ level: 'low', rationale: 'Thought leadership' });
    const result = await classifySeverity(model, logger, {
      title: 'Why CISOs should think about culture',
      text: 'An opinion piece on security culture with no IOCs or active campaigns.',
    });
    expect(result.level).toBe('low');
    expect(result.score).toBe(20);
  });

  it('returns medium with score 40 when the model returns medium', async () => {
    const { model } = buildModel({ level: 'medium' });
    const result = await classifySeverity(model, logger, {
      text: 'Vendor advisory listing IOCs for a known campaign.',
    });
    expect(result).toEqual({ level: 'medium', score: 40 });
  });

  it('throws when the model returns an invalid level', async () => {
    const { model } = buildModel({ level: 'urgent' } as unknown as ClassifySeverityLlmOutput);
    await expect(classifySeverity(model, logger, { text: 'body' })).rejects.toThrow(
      /invalid level/
    );
  });

  it('throws when the model returns no parsed output', async () => {
    const { model } = buildModel(undefined);
    await expect(classifySeverity(model, logger, { text: 'body' })).rejects.toThrow(
      /invalid level/
    );
  });

  it('includes title, categories, and ioc_count in the prompt when provided', async () => {
    const { model, invoke } = buildModel({ level: 'high' });
    await classifySeverity(model, logger, {
      title: 'APT29 spearphish',
      text: 'Campaign detail…',
      categories: ['phishing', 'apt'],
      ioc_count: 12,
      report_id: 'r-1',
    });
    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('APT29 spearphish');
    expect(prompt).toContain('phishing, apt');
    expect(prompt).toContain('Extracted IOC count: 12');
    expect(prompt).toContain('Report id: r-1');
  });

  it('truncates body text to 30 000 chars in the prompt', async () => {
    const { model, invoke } = buildModel({ level: 'medium' });
    await classifySeverity(model, logger, { text: 'x'.repeat(40_000) });
    const prompt = invoke.mock.calls[0][0] as string;
    const bodyStart = prompt.indexOf('Report text:\n') + 'Report text:\n'.length;
    expect(prompt.slice(bodyStart).length).toBeLessThanOrEqual(30_000);
  });
});

describe('toSeverityResult', () => {
  it('maps high to score 70', () => {
    expect(toSeverityResult('high')).toEqual({ level: 'high', score: 70 });
  });
});

describe('classifySeverityLlmOutputSchema bounds', () => {
  it('truncates an over-long rationale', () => {
    const parsed = classifySeverityLlmOutputSchema.parse({
      level: 'high',
      rationale: 'x'.repeat(50_000),
    });
    expect(parsed.rationale?.length).toBe(2_000);
  });

  it('leaves the rationale optional', () => {
    expect(classifySeverityLlmOutputSchema.parse({ level: 'low' }).rationale).toBeUndefined();
  });
});
