/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ExtractedIoc } from './extract_iocs';
import {
  adjudicateIocs,
  type IocAdjudicationModelOutput,
  iocAdjudicationModelOutputSchema,
} from './adjudicate_iocs';

const candidate = (value: string, overrides: Partial<ExtractedIoc> = {}): ExtractedIoc => ({
  type: 'url',
  value,
  defanged: value,
  tier: 'uncertain',
  tier_heuristic: 'uncertain',
  tier_basis: 'uncertain_default',
  ...overrides,
});

const buildModel = (
  output: IocAdjudicationModelOutput
): { model: ScopedModel; invoke: jest.Mock } => {
  const invoke = jest.fn().mockResolvedValue({
    raw: { response_metadata: {} },
    parsed: output,
  });
  const chatModel = {
    withStructuredOutput: jest.fn().mockReturnValue({ invoke }),
  } as unknown as ScopedModel['chatModel'];
  const connector = { connectorId: 'test-connector' } as ScopedModel['connector'];
  return { model: { chatModel, connector } as ScopedModel, invoke };
};

describe('adjudicateIocs', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downgrades Markdown citations without spending a model call', async () => {
    const url = 'https://attack.mitre.org/techniques/T1059/';
    const { model, invoke } = buildModel({ indicator_ids: [] });

    const result = await adjudicateIocs(model, logger, {
      text: `See [ATT&CK](${url}) for background.`,
      article_url: 'https://www.elastic.co/security-labs/example',
      iocs: [candidate(url)],
    });

    expect(result.iocs[0]).toEqual(
      expect.objectContaining({
        tier: 'reference',
        tier_basis: 'semantic_reference_deterministic',
      })
    );
    expect(result.promotable_count).toBe(0);
    expect(result.ioc_set_hash).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('downgrades same-origin article links without a model call', async () => {
    const { model, invoke } = buildModel({ indicator_ids: [] });
    const result = await adjudicateIocs(model, logger, {
      text: 'More research at https://research.example/another-post',
      article_url: 'https://research.example/current-post',
      iocs: [candidate('https://research.example/another-post')],
    });

    expect(result.iocs[0].tier).toBe('reference');
    expect(result.adjudication.deterministic_references).toBe(1);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('keeps only candidates the semantic model affirms as attacker controlled', async () => {
    const malicious = 'https://evil.example/payload';
    const documentation = 'https://docs.example/product';
    const { model, invoke } = buildModel({ indicator_ids: [0] });

    const result = await adjudicateIocs(model, logger, {
      title: 'Campaign report',
      text:
        `The attacker downloaded its payload from ${malicious}. ` +
        `Defenders can read ${documentation} for product guidance.`,
      iocs: [candidate(malicious), candidate(documentation)],
    });

    expect(result.iocs[0]).toEqual(
      expect.objectContaining({
        tier: 'uncertain',
        tier_basis: 'semantic_indicator:uncertain_default',
      })
    );
    expect(result.iocs[1]).toEqual(
      expect.objectContaining({ tier: 'reference', tier_basis: 'semantic_reference' })
    );
    expect(result.anchor_iocs).toHaveLength(1);
    expect(result.promotable_count).toBe(1);
    expect(result.ioc_set_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toContain('attacker downloaded its payload');
  });

  it('preserves deterministic non-URL indicators without model review', async () => {
    const hash = 'a'.repeat(64);
    const { model, invoke } = buildModel({ indicator_ids: [] });
    const result = await adjudicateIocs(model, logger, {
      text: `Payload SHA-256: ${hash}`,
      iocs: [
        candidate(hash, {
          type: 'hash',
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'hash_high_entropy',
        }),
      ],
    });

    expect(result.iocs[0].tier).toBe('discriminating');
    expect(result.promotable_count).toBe(1);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('iocAdjudicationModelOutputSchema', () => {
  it('rejects invalid candidate ids', () => {
    expect(() => iocAdjudicationModelOutputSchema.parse({ indicator_ids: [-1] })).toThrow();
  });
});
