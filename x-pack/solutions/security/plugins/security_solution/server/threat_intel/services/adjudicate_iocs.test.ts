/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IOC_TIER_BASIS_LENGTH } from '../../../common/threat_intel/contracts/enrichment';
import type { ExtractedIoc } from './extract_iocs';
import {
  boundIocAdjudicationForOverflow,
  boundIocAdjudicationForPayload,
  chunkIocAdjudicationBatches,
  MAX_SEMANTIC_CANDIDATES_PER_BATCH,
  MAX_SEMANTIC_REVIEW_BATCHES,
  OVERFLOW_MAX_SEMANTIC_CANDIDATES,
  OVERFLOW_RETRY2_MAX_PAYLOAD_CHARS,
  OVERFLOW_RETRY2_MAX_SEMANTIC_CANDIDATES,
  prepareIocAdjudication,
  reconcileIocAdjudication,
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

describe('prepareIocAdjudication and reconcileIocAdjudication', () => {
  it('sends Markdown link destinations to semantic review', () => {
    // Markdown link forms of attacker payload URLs exist too. Auto-downgrading
    // every `](url)` destination would drop real IOCs before the model sees them.
    const payload = 'https://evil.example/payload';
    const citation = 'https://attack.mitre.org/techniques/T1059/';
    const prepared = prepareIocAdjudication({
      text:
        `The attacker downloaded [the payload](${payload}). ` +
        `See [ATT&CK](${citation}) for background.`,
      article_url: 'https://www.elastic.co/security-labs/example',
      iocs: [candidate(payload), candidate(citation)],
    });
    const result = reconcileIocAdjudication(prepared, new Set([0]));

    expect(prepared.reviewable).toHaveLength(2);
    expect(result.iocs[0]).toEqual(
      expect.objectContaining({
        tier: 'uncertain',
        tier_basis: 'semantic_indicator:uncertain_default',
      })
    );
    expect(result.iocs[1]).toEqual(
      expect.objectContaining({ tier: 'reference', tier_basis: 'semantic_reference' })
    );
    expect(result.promotable_count).toBe(1);
  });

  it('downgrades same-origin article links without semantic review', () => {
    const prepared = prepareIocAdjudication({
      text: 'More research at https://research.example/another-post',
      article_url: 'https://research.example/current-post',
      iocs: [candidate('https://research.example/another-post')],
    });
    const result = reconcileIocAdjudication(prepared, new Set());

    expect(result.iocs[0].tier).toBe('reference');
    expect(result.adjudication.deterministic_references).toBe(1);
    expect(prepared.reviewable).toHaveLength(0);
  });

  it('keeps only candidates selected by stable candidate id', () => {
    const malicious = 'https://evil.example/payload';
    const documentation = 'https://docs.example/product';
    const prepared = prepareIocAdjudication({
      text:
        `The attacker downloaded its payload from ${malicious}. ` +
        `Defenders can read ${documentation} for product guidance.`,
      iocs: [candidate(malicious), candidate(documentation)],
    });
    const result = reconcileIocAdjudication(prepared, new Set([0]));

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
    expect(prepared.reviewable[0].context).toContain('attacker downloaded its payload');
  });

  it('preserves deterministic non-URL indicators without semantic review', () => {
    const hash = 'a'.repeat(64);
    const prepared = prepareIocAdjudication({
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
    const result = reconcileIocAdjudication(prepared, new Set());

    expect(result.iocs[0].tier).toBe('discriminating');
    expect(result.promotable_count).toBe(1);
    expect(prepared.reviewable).toHaveLength(0);
  });

  it('locates defanged IOC values in a refanged copy for review context', () => {
    const canonical = 'https://evil.example/payload.exe';
    const defanged = 'hxxps://evil[.]example/payload.exe';
    const prepared = prepareIocAdjudication({
      text: `The dropper fetched ${defanged} over HTTPS.`,
      iocs: [candidate(canonical, { defanged })],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.reviewable[0].context).toContain('dropper fetched');
    expect(prepared.reviewable[0].context).toContain(canonical);
  });

  it('prefers an attributed later IOC occurrence over an earlier citation', () => {
    const url = 'https://evil.example/payload';
    const prepared = prepareIocAdjudication({
      text:
        `See the vendor write-up at ${url} for background. ` +
        `${'unrelated prose. '.repeat(40)}` +
        `The attacker later downloaded the payload from ${url} during staging.`,
      iocs: [candidate(url)],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.reviewable[0].context).toContain('attacker later downloaded');
    expect(prepared.reviewable[0].context).not.toContain('vendor write-up');
  });

  it('prefers an attributed defanged occurrence over an earlier canonical citation', () => {
    const canonical = 'https://evil.example/payload';
    const defanged = 'hxxps://evil[.]example/payload';
    const prepared = prepareIocAdjudication({
      text:
        `See ${canonical} for background. ` +
        `${'unrelated prose. '.repeat(40)}` +
        `The attacker downloaded ${defanged} during staging.`,
      iocs: [candidate(canonical, { defanged })],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.reviewable[0].context).toContain('attacker downloaded');
    expect(prepared.reviewable[0].context).not.toContain('for background');
  });

  it('reuses cached review context for duplicate candidate values', () => {
    const url = 'https://evil.example/payload';
    const prepared = prepareIocAdjudication({
      text: `The attacker downloaded ${url} twice.`,
      iocs: [candidate(url), candidate(url)],
    });

    expect(prepared.reviewable).toHaveLength(2);
    expect(prepared.reviewable[0].context).toBe(prepared.reviewable[1].context);
    expect(prepared.reviewable[0].context).toContain('attacker downloaded');
  });

  it('keeps an approved tier_basis within the response schema bound', () => {
    const longBasis = 'b'.repeat(MAX_IOC_TIER_BASIS_LENGTH);
    const prepared = prepareIocAdjudication({
      text: 'The attacker downloaded https://evil.example/payload.',
      iocs: [candidate('https://evil.example/payload', { tier_basis: longBasis })],
    });
    const result = reconcileIocAdjudication(prepared, new Set([0]));

    expect(result.iocs[0].tier_basis.startsWith('semantic_indicator:')).toBe(true);
    expect(result.iocs[0].tier_basis.length).toBe(MAX_IOC_TIER_BASIS_LENGTH);
  });

  it('bounds candidate count and context for overflow retry without rejecting skipped IOCs', () => {
    const iocs = Array.from({ length: OVERFLOW_MAX_SEMANTIC_CANDIDATES + 10 }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const text = iocs.map((ioc) => `Fetched ${ioc.value} from C2.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs });
    const bounded = boundIocAdjudicationForOverflow(prepared);
    const result = reconcileIocAdjudication(bounded, new Set([0]));

    expect(bounded.reviewable).toHaveLength(OVERFLOW_MAX_SEMANTIC_CANDIDATES);
    expect(bounded.deferredUnreviewed).toBe(10);
    expect(bounded.reviewable.every((entry) => entry.context.length <= 120)).toBe(true);
    // Skipped candidates keep their heuristic tier; only reviewed IDs are verdicted.
    expect(result.iocs[OVERFLOW_MAX_SEMANTIC_CANDIDATES].tier).toBe('discriminating');
    expect(result.adjudication.deferred_unreviewed).toBe(10);
  });

  it('centers overflow context on the IOC instead of taking a leading prefix', () => {
    const url = 'https://evil.example/payload';
    const prepared = prepareIocAdjudication({
      text: `${'leading attribution prose '.repeat(20)}${url} trailing notes`,
      iocs: [candidate(url)],
    });
    expect(prepared.reviewable[0].context.length).toBeGreaterThan(120);

    const bounded = boundIocAdjudicationForOverflow(prepared);

    expect(bounded.reviewable[0].context.length).toBeLessThanOrEqual(120);
    expect(bounded.reviewable[0].context).toContain(url);
  });

  it('reviews candidates in bounded batches instead of discarding overflow as reference', () => {
    const total =
      MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES +
      MAX_SEMANTIC_CANDIDATES_PER_BATCH;
    const iocs = Array.from({ length: total }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const text = iocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs });
    const { batches, deferred } = chunkIocAdjudicationBatches(prepared.reviewable);

    expect(batches).toHaveLength(MAX_SEMANTIC_REVIEW_BATCHES);
    expect(batches.every((batch) => batch.length <= MAX_SEMANTIC_CANDIDATES_PER_BATCH)).toBe(true);
    expect(prepared.deferredUnreviewed).toBe(MAX_SEMANTIC_CANDIDATES_PER_BATCH);
    expect(deferred).toHaveLength(0);
    expect(prepared.reviewable).toHaveLength(
      MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES
    );
    // Capacity leftovers keep heuristic tiers rather than becoming reference.
    expect(iocs[prepared.reviewable.length].tier).toBe('discriminating');
    expect(prepared.output[prepared.reviewable.length].tier).toBe('discriminating');
  });

  it('shrinks candidate payload by size on a second overflow retry', () => {
    const iocs = Array.from({ length: OVERFLOW_MAX_SEMANTIC_CANDIDATES }, (_, index) =>
      candidate(`https://evil.example/${'a'.repeat(1_800)}-${index}`)
    );
    const text = iocs.map((ioc) => `Fetched ${ioc.value} from C2.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs });
    const first = boundIocAdjudicationForOverflow(prepared);
    const second = boundIocAdjudicationForPayload(first);

    expect(first.reviewable).toHaveLength(OVERFLOW_MAX_SEMANTIC_CANDIDATES);
    expect(second.reviewable.length).toBeGreaterThan(0);
    expect(second.reviewable.length).toBeLessThanOrEqual(OVERFLOW_RETRY2_MAX_SEMANTIC_CANDIDATES);
    expect(
      JSON.stringify(
        second.reviewable.map(({ id, ioc, context }) => ({
          id,
          type: ioc.type,
          value: ioc.value,
          context,
        }))
      ).length
    ).toBeLessThanOrEqual(OVERFLOW_RETRY2_MAX_PAYLOAD_CHARS);
  });
});
