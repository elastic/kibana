/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ExtractedIoc } from './extract_iocs';
import {
  enrichReportCore,
  reportCoreModelOutputSchema,
  type ReportCoreModelOutput,
} from './enrich_report_core';

const URL = 'https://evil.example/PAYLOAD/Stage2.exe';
const HASH = 'A'.repeat(64);
const iocs: ExtractedIoc[] = [
  {
    type: 'url',
    value: URL,
    tier: 'contextual',
    tier_heuristic: 'contextual',
    tier_basis: 'test',
  },
  {
    type: 'hash',
    value: HASH,
    tier: 'discriminating',
    tier_heuristic: 'discriminating',
    tier_basis: 'test',
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
    const invoke = jest.fn().mockResolvedValue({ raw: { response_metadata: {} }, parsed: OUTPUT });
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

  it('retries with evenly distributed degraded context only after overflow', async () => {
    const overflow = Object.assign(new Error('context window exceeded'), {
      code: 'contextLengthExceededError',
    });
    const invoke = jest
      .fn()
      .mockRejectedValueOnce(overflow)
      .mockResolvedValueOnce({ raw: { response_metadata: {} }, parsed: OUTPUT });
    const text = `${'start '.repeat(50_000)}MIDDLE_EVIDENCE${' end'.repeat(50_000)}`;

    const result = await enrichReportCore(buildModel(invoke), logger, { text, iocs });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.context.mode).toBe('degraded_context');
    expect(result.context.coverage).toBeLessThan(1);
    expect(invoke.mock.calls[1][0]).toContain('MIDDLE_EVIDENCE');
  });
});
