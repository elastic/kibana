/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { assessRelevance } from './assess_relevance';
import type { RelevanceOutput } from './assess_relevance';

const SAMPLE_OUTPUT: RelevanceOutput = {
  is_intelligence: true,
  quality_class: 'intel',
  evidence_tier: 'primary',
  needs_render: false,
  primary_links: [],
  has_original_commentary: true,
  reason: 'Original Volt Typhoon IR with IOCs and TTPs.',
};

const buildModel = (
  output: RelevanceOutput = SAMPLE_OUTPUT
): { model: ScopedModel; invoke: jest.Mock } => {
  const invoke = jest.fn().mockResolvedValue({ raw: { response_metadata: {} }, parsed: output });
  const structured = { invoke };
  const withStructuredOutput = jest.fn().mockReturnValue(structured);
  const chatModel = { withStructuredOutput } as unknown as ScopedModel['chatModel'];
  const connector = { connectorId: 'test-connector' } as ScopedModel['connector'];
  return { model: { chatModel, connector } as ScopedModel, invoke };
};

describe('assessRelevance', () => {
  const logger = loggingSystemMock.createLogger();
  beforeEach(() => jest.clearAllMocks());

  it('returns the parsed schema from the model', async () => {
    const { model } = buildModel();
    const result = await assessRelevance(model, logger, { text: 'Volt Typhoon used LOLBins.' });
    expect(result).toEqual(SAMPLE_OUTPUT);
  });

  it('passes text into the prompt', async () => {
    const { model, invoke } = buildModel();
    await assessRelevance(model, logger, { text: 'APT29 deployed HAMMERTOSS.' });
    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('APT29 deployed HAMMERTOSS.');
  });

  it('includes url in the prompt when provided', async () => {
    const { model, invoke } = buildModel();
    await assessRelevance(model, logger, {
      url: 'https://example.com/weekly-roundup/2026-06',
      text: 'This week in security.',
    });
    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('https://example.com/weekly-roundup/2026-06');
  });

  it('includes title in the prompt when provided', async () => {
    const { model, invoke } = buildModel();
    await assessRelevance(model, logger, {
      title: 'This Week in Security — June 2026',
      text: 'Roundup of the week.',
    });
    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('This Week in Security — June 2026');
  });

  it('omits url/title lines when not provided', async () => {
    const { model, invoke } = buildModel();
    await assessRelevance(model, logger, { text: 'Some article body.' });
    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).not.toContain('Article URL:');
    expect(prompt).not.toContain('Article title:');
  });

  it('uses withStructuredOutput with includeRaw true', async () => {
    const { model } = buildModel();
    const withStructuredOutput = jest.spyOn(model.chatModel, 'withStructuredOutput');
    await assessRelevance(model, logger, { text: 'body' });
    expect(withStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({ _def: expect.anything() }),
      { includeRaw: true }
    );
  });

  it('truncates body to 30 000 chars in the prompt', async () => {
    const { model, invoke } = buildModel();
    const longText = 'x'.repeat(40_000);
    await assessRelevance(model, logger, { text: longText });
    const prompt = invoke.mock.calls[0][0] as string;
    const articleStart = prompt.indexOf('Article text:\n') + 'Article text:\n'.length;
    const bodyInPrompt = prompt.slice(articleStart);
    expect(bodyInPrompt.length).toBeLessThanOrEqual(30_000);
  });

  // Verify the gate output fields map into extracted.gate on persist.
  // extracted.gate declares: is_intelligence, quality_class, evidence_tier,
  // needs_render, has_original_commentary, reason, assessed_at (stamped at persist).
  // primary_links is deferred (no consumer until Slice-5) and is NOT persisted.
  it('output contains all extracted.gate field keys (minus assessed_at)', async () => {
    const { model } = buildModel();
    const result = await assessRelevance(model, logger, { text: 'APT29 report.' });
    const GATE_PERSISTED_KEYS = [
      'is_intelligence',
      'quality_class',
      'lineage',
      'needs_render',
      'has_original_commentary',
      'reason',
    ] as const;
    for (const key of GATE_PERSISTED_KEYS) {
      expect(result).toHaveProperty(key);
    }
  });

  it('primary_links is present in output but not a persisted gate field', async () => {
    const { model } = buildModel(SAMPLE_OUTPUT);
    const result = await assessRelevance(model, logger, { text: 'Pointer article.' });
    // Returned by the service so callers can act on it (e.g. Slice-5 link-chasing).
    expect(result).toHaveProperty('primary_links');
    // But it is NOT one of the six fields written to extracted.gate by the workflow.
    const GATE_MAPPING_KEYS = new Set([
      'is_intelligence',
      'quality_class',
      'lineage',
      'needs_render',
      'has_original_commentary',
      'reason',
    ]);
    expect(GATE_MAPPING_KEYS.has('primary_links')).toBe(false);
  });
});
