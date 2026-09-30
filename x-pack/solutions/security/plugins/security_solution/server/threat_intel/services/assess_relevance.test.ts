/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { assessRelevance, relevanceOutputSchema } from './assess_relevance';
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

  it('returns every schema field', async () => {
    const { model } = buildModel();
    const result = await assessRelevance(model, logger, { text: 'APT29 report.' });
    expect(Object.keys(result).sort()).toEqual(
      [
        'evidence_tier',
        'has_original_commentary',
        'is_intelligence',
        'needs_render',
        'primary_links',
        'quality_class',
        'reason',
      ].sort()
    );
  });
});

// `withStructuredOutput` is mocked everywhere above, so the schema's own parsing of
// model output is never exercised by those tests. These are the assertions that fail
// if the bound is removed.
describe('relevanceOutputSchema bounds', () => {
  const valid = {
    is_intelligence: true,
    quality_class: 'intel' as const,
    evidence_tier: 'primary' as const,
    needs_render: false,
    primary_links: ['https://vendor.test/a'],
    has_original_commentary: true,
    reason: 'because',
  };

  it('truncates an over-long reason rather than rejecting the whole enrichment', () => {
    const parsed = relevanceOutputSchema.parse({ ...valid, reason: 'x'.repeat(50_000) });
    expect(parsed.reason.length).toBe(2_000);
  });

  it('caps the number of primary links', () => {
    const parsed = relevanceOutputSchema.parse({
      ...valid,
      primary_links: Array.from({ length: 500 }, (_v, i) => `https://vendor.test/${i}`),
    });
    expect(parsed.primary_links.length).toBe(20);
  });

  it('caps the length of each primary link', () => {
    const parsed = relevanceOutputSchema.parse({
      ...valid,
      primary_links: [`https://vendor.test/${'a'.repeat(50_000)}`],
    });
    expect(parsed.primary_links[0].length).toBe(2_048);
  });

  it('leaves ordinary output untouched', () => {
    expect(relevanceOutputSchema.parse(valid)).toEqual(valid);
  });
});
