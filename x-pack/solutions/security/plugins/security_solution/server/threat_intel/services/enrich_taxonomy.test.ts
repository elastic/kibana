/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { ChatCompletionErrorCode, InferenceTaskError } from '@kbn/inference-common';
import { enrichTaxonomy, taxonomyOutputSchema } from './enrich_taxonomy';

const validOutput = {
  categories: ['ransomware'],
  regions: ['europe'],
  relevance: 0.75,
  diamond_suitable: true,
};

describe('enrichTaxonomy', () => {
  const logger = loggingSystemMock.createLogger();

  it('retries with a smaller context after a confirmed overflow', async () => {
    const overflow = new InferenceTaskError(
      ChatCompletionErrorCode.ContextLengthExceededError,
      'maximum context window exceeded',
      {}
    );
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockResolvedValueOnce({
        raw: { response_metadata: {} },
        parsed: validOutput,
      });
    const model = {
      chatModel: {
        withStructuredOutput: jest.fn().mockReturnValue({ invoke }),
      },
      connector: { connectorId: 'test-connector' },
    } as unknown as ScopedModel;
    const text = 'token-dense taxonomy source '.repeat(4_000);

    const result = await enrichTaxonomy(model, logger, { text });

    expect(result).toEqual(validOutput);
    expect(invoke).toHaveBeenCalledTimes(2);
    const retryPrompt = invoke.mock.calls[1][0] as string;
    const bodyStart = retryPrompt.indexOf('Report text:\n') + 'Report text:\n'.length;
    expect(retryPrompt.slice(bodyStart).length).toBeLessThan(text.length);
  });
});

describe('taxonomyOutputSchema', () => {
  it('accepts a well-formed taxonomy', () => {
    expect(taxonomyOutputSchema.parse(validOutput)).toEqual(validOutput);
  });

  it('drops categories outside the closed set instead of indexing them', () => {
    const parsed = taxonomyOutputSchema.parse({
      ...validOutput,
      categories: ['ransomware', 'hacktivism-but-invented', 'phishing'],
    });

    expect(parsed.categories).toEqual(['ransomware', 'phishing']);
  });

  it('drops regions outside the closed set', () => {
    const parsed = taxonomyOutputSchema.parse({
      ...validOutput,
      regions: ['antarctica', 'global'],
    });

    expect(parsed.regions).toEqual(['global']);
  });

  it('de-duplicates repeated labels', () => {
    const parsed = taxonomyOutputSchema.parse({
      ...validOutput,
      categories: ['malware', 'malware', 'malware'],
    });

    expect(parsed.categories).toEqual(['malware']);
  });

  it('rejects a relevance score outside [0, 1]', () => {
    expect(() => taxonomyOutputSchema.parse({ ...validOutput, relevance: 42 })).toThrow();
    expect(() => taxonomyOutputSchema.parse({ ...validOutput, relevance: -0.5 })).toThrow();
  });
});
