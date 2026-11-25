/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { ChatCompletionErrorCode, InferenceTaskError } from '@kbn/inference-common';
import type { ExtractedIoc } from './extract_iocs';
import { z } from '@kbn/zod/v4';
import {
  ENRICH_REPORT_CORE_MAX_ARTIFACTS as MAX_REPORT_ARTIFACTS,
  ENRICH_REPORT_CORE_MAX_BEHAVIORS as MAX_REPORT_BEHAVIORS,
  enrichReportCoreResponseSchema,
} from '../../../common/threat_intel';
import {
  enrichReportCore,
  iocAdjudicationOnlySchema,
  reportCoreModelOutputSchema,
  type ReportCoreModelOutput,
} from './enrich_report_core';
import { hashIocSet } from './adjudicate_iocs';

const URL = 'https://evil.example/PAYLOAD/Stage2.exe';
const HASH = 'a'.repeat(64);
const iocs: ExtractedIoc[] = [
  {
    type: 'url',
    value: URL,
    tier: 'contextual',
    tier_heuristic: 'contextual',
    tier_basis: 'test',
    context: `The attacker downloaded ${URL}.`,
  },
  {
    type: 'hash',
    value: HASH,
    tier: 'discriminating',
    tier_heuristic: 'discriminating',
    // Only prose hashes are reviewed; section and defanged hashes stay deterministic.
    tier_basis: 'hash_high_entropy',
    context: `Payload hash ${HASH}.`,
  },
];

const OUTPUT: ReportCoreModelOutput = {
  categories: ['malware'],
  regions: [],
  relevance: 0.9,
  diamond_suitable: true,
  severity: { level: 'high', rationale: 'Concrete malware campaign.' },
  approved_ioc_candidate_ids: [0],
  behaviors: [
    {
      technique_id: 'T1059.001',
      description: 'PowerShell launched the staged payload.',
      telemetry_targets: ['process.command_line'],
      confidence: 0.9,
    },
  ],
  artifacts: [{ type: 'filename', value: 'Stage2.exe', context: 'staged payload' }],
};

const buildModel = (invoke: jest.Mock) => {
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
  return {
    connector: { connectorId: 'sonnet-test' },
    chatModel: { withStructuredOutput },
  } as unknown as ScopedModel;
};

describe('reportCoreModelOutputSchema', () => {
  it('canonicalizes slash-separated and lowercase ATT&CK technique ids', () => {
    const parsed = reportCoreModelOutputSchema.parse({
      ...OUTPUT,
      behaviors: [
        { ...OUTPUT.behaviors[0], technique_id: 'T1053/005' },
        { ...OUTPUT.behaviors[0], technique_id: 't1059.001' },
      ],
    });

    expect(parsed.behaviors.map(({ technique_id }) => technique_id)).toEqual([
      'T1053.005',
      'T1059.001',
    ]);
  });

  // `withStructuredOutput` sends `z.toJSONSchema(schema, { io: 'input' })` as the tool schema.
  // Gemini answers 400 to this schema when its arrays carry `maxItems`, so the caps are
  // applied after parsing instead.
  const collectKeys = (node: unknown, found: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(node)) {
      node.forEach((child) => collectKeys(child, found));
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        found.add(key);
        collectKeys(value, found);
      }
    }
    return found;
  };

  it.each([
    ['reportCoreModelOutputSchema', reportCoreModelOutputSchema],
    ['iocAdjudicationOnlySchema', iocAdjudicationOnlySchema],
  ])('sends %s to the model without maxItems or minItems', (_name, schema) => {
    const keys = collectKeys(z.toJSONSchema(schema, { io: 'input' }));

    expect(keys.has('maxItems')).toBe(false);
    expect(keys.has('minItems')).toBe(false);
  });

  it('keeps every approved id the model returns, including repeats', () => {
    const ids = [...Array.from({ length: 400 }, () => 7), 0];

    expect(
      reportCoreModelOutputSchema.parse({ ...OUTPUT, approved_ioc_candidate_ids: ids })
        .approved_ioc_candidate_ids
    ).toEqual(ids);
    expect(
      iocAdjudicationOnlySchema.parse({ approved_ioc_candidate_ids: ids })
        .approved_ioc_candidate_ids
    ).toEqual(ids);
  });

  it('keeps rejecting out-of-range candidate ids', () => {
    expect(
      reportCoreModelOutputSchema.safeParse({ ...OUTPUT, approved_ioc_candidate_ids: [5_000] })
        .success
    ).toBe(false);
  });

  it('clears malformed ATT&CK technique ids', () => {
    const parsed = reportCoreModelOutputSchema.parse({
      ...OUTPUT,
      behaviors: [{ ...OUTPUT.behaviors[0], technique_id: 'not-an-attack-id' }],
    });

    expect(parsed.behaviors[0].technique_id).toBe('');
  });
});

describe('enrichReportCore', () => {
  const logger = loggingSystemMock.createLogger();

  it('returns exact deterministic IOC values selected by candidate id', async () => {
    const invoke = jest.fn().mockResolvedValue({
      raw: { response_metadata: {} },
      parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0, 1] },
    });
    const result = await enrichReportCore(buildModel(invoke), logger, {
      text: `The attacker downloaded ${URL}. Payload hash ${HASH}.`,
      iocs,
    });

    expect(result.anchor_iocs.map(({ value }) => value)).toEqual([URL, HASH]);
    expect(result.anchor_iocs[0].value).toBe(URL);
    expect(result.severity).toEqual({
      level: 'high',
      score: 70,
      rationale: 'Concrete malware campaign.',
    });
    expect(result.behaviors[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^[a-f0-9]{64}$/),
        llm_confidence: 0.9,
      })
    );
    expect(result.context.mode).toBe('full');
  });

  it('caps behaviors and artifacts in model order and logs a warning when it drops any', async () => {
    const warnLogger = loggingSystemMock.createLogger();
    const invoke = jest.fn().mockResolvedValue({
      raw: { response_metadata: {} },
      parsed: {
        ...OUTPUT,
        behaviors: Array.from({ length: MAX_REPORT_BEHAVIORS + 5 }, (_, index) => ({
          ...OUTPUT.behaviors[0],
          description: `behavior ${index}`,
        })),
        artifacts: Array.from({ length: MAX_REPORT_ARTIFACTS + 5 }, (_, index) => ({
          ...OUTPUT.artifacts[0],
          value: `artifact-${index}`,
        })),
      },
    });
    const result = await enrichReportCore(buildModel(invoke), warnLogger, {
      text: `The attacker downloaded ${URL}. Payload hash ${HASH}.`,
      iocs,
    });

    // The capped result must still pass the route's response validation.
    expect(() => enrichReportCoreResponseSchema.validate(result)).not.toThrow();
    expect(result.behaviors).toHaveLength(MAX_REPORT_BEHAVIORS);
    expect(result.behaviors[0].description).toBe('behavior 0');
    expect(result.artifacts).toHaveLength(MAX_REPORT_ARTIFACTS);
    expect(result.artifacts[MAX_REPORT_ARTIFACTS - 1].value).toBe(
      `artifact-${MAX_REPORT_ARTIFACTS - 1}`
    );
    expect(warnLogger.warn).toHaveBeenCalledWith(
      `enrich_report_core returned ${
        MAX_REPORT_BEHAVIORS + 5
      } behaviors; keeping the first ${MAX_REPORT_BEHAVIORS}`
    );
    expect(warnLogger.warn).toHaveBeenCalledWith(
      `enrich_report_core returned ${
        MAX_REPORT_ARTIFACTS + 5
      } artifacts; keeping the first ${MAX_REPORT_ARTIFACTS}`
    );
  });

  it('does not warn when behaviors and artifacts are within the caps', async () => {
    const quietLogger = loggingSystemMock.createLogger();
    const invoke = jest.fn().mockResolvedValue({ raw: { response_metadata: {} }, parsed: OUTPUT });
    await enrichReportCore(buildModel(invoke), quietLogger, {
      text: `The attacker downloaded ${URL}. Payload hash ${HASH}.`,
      iocs,
    });

    expect(quietLogger.warn).not.toHaveBeenCalled();
  });

  it('keeps approved ids listed after many repeats and ignores ids from a later batch', async () => {
    const invoke = jest.fn().mockImplementation((prompt: string) => {
      const isCore = String(prompt).includes('taxonomy');
      return Promise.resolve({
        raw: { response_metadata: {} },
        parsed: isCore
          ? // 305 is a real candidate, but it belongs to the second batch.
            {
              ...OUTPUT,
              approved_ioc_candidate_ids: [...Array.from({ length: 400 }, () => 0), 305, 1],
            }
          : { approved_ioc_candidate_ids: [] },
      });
    });
    const manyIocs = Array.from({ length: 320 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'discriminating' as const,
      tier_heuristic: 'discriminating' as const,
      tier_basis: 'url_path_entropy',
      context: `C2 fetched https://evil.example/payload-${index}.`,
    }));
    const text = manyIocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.iocs[0].tier_basis).toContain('semantic_indicator:');
    expect(result.iocs[1].tier_basis).toContain('semantic_indicator:');
    // The second batch reviewed 305 and left it unapproved; the core call's verdict must not carry over.
    expect(result.iocs[305].tier).toBe('reference');
  });

  it('downgrades an unapproved hash candidate to reference', async () => {
    const invoke = jest.fn().mockResolvedValue({ raw: { response_metadata: {} }, parsed: OUTPUT });
    const result = await enrichReportCore(buildModel(invoke), logger, {
      text: `The attacker downloaded ${URL}. Payload hash ${HASH}.`,
      iocs,
    });

    expect(result.anchor_iocs.map(({ value }) => value)).toEqual([URL]);
    expect(result.iocs[1]).toEqual(
      expect.objectContaining({
        value: HASH,
        tier: 'reference',
        tier_basis: 'semantic_reference',
      })
    );
  });

  it('retries with evenly distributed degraded context only after overflow', async () => {
    const overflow = new InferenceTaskError(
      ChatCompletionErrorCode.ContextLengthExceededError,
      'context window exceeded',
      {}
    );
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockResolvedValueOnce({ raw: { response_metadata: {} }, parsed: OUTPUT });
    const text = `${'L'.repeat(200_000)}MIDDLE_EVIDENCE${'R'.repeat(200_000)}`;

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.context.mode).toBe('degraded_context');
    expect(result.context.coverage).toBeLessThan(1);
    expect(result.context.selected_chars).toBeLessThanOrEqual(30_000);
    expect(invoke.mock.calls[1][0]).toContain('MIDDLE_EVIDENCE');
  });

  it('shrinks context again when the first overflow retry still exceeds the window', async () => {
    const overflow = new InferenceTaskError(
      ChatCompletionErrorCode.ContextLengthExceededError,
      'context window exceeded',
      {}
    );
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockRejectedValueOnce(overflow)
      .mockResolvedValueOnce({ raw: { response_metadata: {} }, parsed: OUTPUT });
    const text = `${'L'.repeat(200_000)}MIDDLE_EVIDENCE${'R'.repeat(200_000)}`;

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs });

    expect(invoke).toHaveBeenCalledTimes(3);
    expect(result.context.mode).toBe('degraded_context');
    expect(result.context.selected_chars).toBeLessThan(30_000);
    expect(result.context.coverage).toBe(
      result.context.selected_chars / result.context.original_chars
    );
    expect(String(invoke.mock.calls[2][0]).length).toBeLessThan(
      String(invoke.mock.calls[1][0]).length
    );
    expect(invoke.mock.calls[2][0]).toContain('MIDDLE_EVIDENCE');
  });

  it('bounds the IOC candidate payload on overflow retry', async () => {
    const overflow = new InferenceTaskError(
      ChatCompletionErrorCode.ContextLengthExceededError,
      'context window exceeded',
      {}
    );
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockResolvedValue({
        raw: { response_metadata: {} },
        parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
      });
    const manyIocs = Array.from({ length: 60 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'uncertain' as const,
      tier_heuristic: 'uncertain' as const,
      tier_basis: 'uncertain_default',
      context: `Fetched https://evil.example/payload-${index} from C2.`,
    }));
    const text = manyIocs.map((ioc) => `Fetched ${ioc.value}.`).join(' ');

    await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    const retryPrompt = String(invoke.mock.calls[1][0]);
    const candidatesMatch = /IOC candidates:\n(\[[\s\S]*?\])(?:\n\nSource:|$)/.exec(retryPrompt);
    expect(candidatesMatch).not.toBeNull();
    const retryCandidates = JSON.parse(candidatesMatch![1]) as Array<{ context: string }>;
    expect(retryCandidates).toHaveLength(50);
    expect(retryCandidates.every((entry) => entry.context.length <= 120)).toBe(true);
    // Overflow-skipped candidates are re-queued for a follow-up adjudication pass.
    expect(invoke.mock.calls.length).toBeGreaterThan(2);
  });

  it('shrinks candidate payload again on a second overflow retry', async () => {
    const overflow = new InferenceTaskError(
      ChatCompletionErrorCode.ContextLengthExceededError,
      'context window exceeded',
      {}
    );
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockRejectedValueOnce(overflow)
      .mockResolvedValue({
        raw: { response_metadata: {} },
        parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
      });
    const manyIocs = Array.from({ length: 50 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/${'a'.repeat(1_800)}-${index}`,
      defanged: `https://evil.example/${'a'.repeat(1_800)}-${index}`,
      tier: 'uncertain' as const,
      tier_heuristic: 'uncertain' as const,
      tier_basis: 'uncertain_default',
      context: `Fetched https://evil.example/${'a'.repeat(1_800)}-${index} from C2.`,
    }));
    const text = manyIocs.map((ioc) => `Fetched ${ioc.value}.`).join(' ');

    await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(invoke.mock.calls.length).toBeGreaterThanOrEqual(3);
    const secondRetryPrompt = String(invoke.mock.calls[2][0]);
    const firstRetryPrompt = String(invoke.mock.calls[1][0]);
    const secondMatch = /IOC candidates:\n(\[[\s\S]*?\])(?:\n\nSource:|$)/.exec(secondRetryPrompt);
    const firstMatch = /IOC candidates:\n(\[[\s\S]*?\])(?:\n\nSource:|$)/.exec(firstRetryPrompt);
    expect(secondMatch).not.toBeNull();
    expect(firstMatch).not.toBeNull();
    const secondRetryCandidates = JSON.parse(secondMatch![1]) as unknown[];
    const firstRetryCandidates = JSON.parse(firstMatch![1]) as unknown[];
    expect(secondRetryCandidates.length).toBeGreaterThan(0);
    expect(secondRetryCandidates.length).toBeLessThanOrEqual(15);
    expect(JSON.stringify(secondRetryCandidates).length).toBeLessThan(
      JSON.stringify(firstRetryCandidates).length
    );
  });

  it('adjudicates additional candidate batches after the core call', async () => {
    const invoke = jest.fn().mockImplementation((prompt: string) => {
      const isCore = String(prompt).includes('taxonomy');
      if (isCore) {
        return Promise.resolve({
          raw: { response_metadata: {} },
          parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
        });
      }
      return Promise.resolve({
        raw: { response_metadata: {} },
        parsed: { approved_ioc_candidate_ids: [300] },
      });
    });
    const manyIocs = Array.from({ length: 320 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'discriminating' as const,
      tier_heuristic: 'discriminating' as const,
      tier_basis: 'url_path_entropy',
      context: `C2 fetched https://evil.example/payload-${index}.`,
    }));
    const text = manyIocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.adjudication.reviewed).toBe(320);
    expect(result.iocs[0].tier_basis).toContain('semantic_indicator:');
    expect(result.iocs[300].tier_basis).toContain('semantic_indicator:');
    // Unreviewed mid-batch IDs from the first call are rejected only if that
    // batch reviewed them. Index 1 was in batch 1 and not approved.
    expect(result.iocs[1].tier).toBe('reference');
  });

  it('keeps the core result when a follow-up adjudication batch fails', async () => {
    const invoke = jest.fn().mockImplementation((prompt: string) => {
      const isCore = String(prompt).includes('taxonomy');
      if (isCore) {
        return Promise.resolve({
          raw: { response_metadata: {} },
          parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
        });
      }
      // Not a context-length-exceeded error, so invokeAdjudicationBatch does
      // not retry and rethrows immediately.
      return Promise.reject(new Error('model returned an unparseable response'));
    });
    const manyIocs = Array.from({ length: 320 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'discriminating' as const,
      tier_heuristic: 'discriminating' as const,
      tier_basis: 'url_path_entropy',
      context: `C2 fetched https://evil.example/payload-${index}.`,
    }));
    const text = manyIocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(result.severity.level).toBe('high');
    expect(result.iocs[0].tier_basis).toContain('semantic_indicator:');
    // The failed batch's candidates keep their heuristic tier, marked deferred,
    // instead of the whole enrichment throwing and the report staying pending.
    expect(result.iocs[300].tier).toBe('discriminating');
    expect(result.iocs[300].deferred_unreviewed).toBe(true);
    expect(result.adjudication.deferred_unreviewed).toBeGreaterThan(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('enrich_report_core_ioc_batch failed')
    );
  });

  it('keeps ioc_set_hash as the pre-adjudication extract fingerprint', async () => {
    const invoke = jest.fn().mockImplementation((prompt: string) => {
      if (String(prompt).includes('taxonomy')) {
        return Promise.resolve({
          raw: { response_metadata: {} },
          parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
        });
      }
      return Promise.resolve({
        raw: { response_metadata: {} },
        parsed: { approved_ioc_candidate_ids: [] },
      });
    });
    const manyIocs = Array.from({ length: 320 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'discriminating' as const,
      tier_heuristic: 'discriminating' as const,
      tier_basis: 'url_path_entropy',
      context: `C2 fetched https://evil.example/payload-${index}.`,
    }));
    const text = manyIocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');
    const expectedHash = hashIocSet(manyIocs);

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(result.ioc_set_hash).toBe(expectedHash);
    // Model verdicts and batching must not move the correlation fingerprint.
    expect(result.anchor_iocs.length).toBeLessThan(manyIocs.length);
  });

  it('prefers extract_iocs ioc_set_hash over recomputing from a capped IOC array', async () => {
    const invoke = jest.fn().mockResolvedValue({
      raw: { response_metadata: {} },
      parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
    });
    const cappedIocs = [
      {
        type: 'url' as const,
        value: 'https://evil.example/payload-0',
        defanged: 'https://evil.example/payload-0',
        tier: 'discriminating' as const,
        tier_heuristic: 'discriminating' as const,
        tier_basis: 'url_path_entropy',
        context: 'C2 fetched https://evil.example/payload-0.',
      },
    ];
    const extractHash = 'a'.repeat(64);

    const result = await enrichReportCore(buildModel(invoke), logger, {
      text: 'C2 fetched https://evil.example/payload-0.',
      iocs: cappedIocs,
      ioc_set_hash: extractHash,
      truncated: true,
    });

    expect(result.ioc_set_hash).toBe(extractHash);
    expect(result.ioc_set_hash).not.toBe(hashIocSet(cappedIocs));
  });

  it('does not resend the full article on follow-up IOC batches', async () => {
    const invoke = jest.fn().mockImplementation((prompt: string) => {
      if (String(prompt).includes('taxonomy')) {
        return Promise.resolve({
          raw: { response_metadata: {} },
          parsed: { ...OUTPUT, approved_ioc_candidate_ids: [0] },
        });
      }
      return Promise.resolve({
        raw: { response_metadata: {} },
        parsed: { approved_ioc_candidate_ids: [300] },
      });
    });
    const manyIocs = Array.from({ length: 320 }, (_, index) => ({
      type: 'url' as const,
      value: `https://evil.example/payload-${index}`,
      defanged: `https://evil.example/payload-${index}`,
      tier: 'discriminating' as const,
      tier_heuristic: 'discriminating' as const,
      tier_basis: 'url_path_entropy',
      context: `C2 fetched https://evil.example/payload-${index}.`,
    }));
    const uniqueMarker = 'UNIQUE_ARTICLE_BODY_MARKER_FOR_BATCH_TEST';
    const text = `${uniqueMarker} ${manyIocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ')}`;

    await enrichReportCore(buildModel(invoke), logger, { text, iocs: manyIocs });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(String(invoke.mock.calls[0][0])).toContain(uniqueMarker);
    expect(String(invoke.mock.calls[1][0])).not.toContain(uniqueMarker);
    expect(String(invoke.mock.calls[1][0])).not.toContain('\nSource:\n');
  });
});
