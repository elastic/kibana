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
  OVERFLOW_RETRY2_MAX_VALUE_CHARS,
  hashIocSet,
  prepareIocAdjudication,
  reconcileIocAdjudication,
  truncateValuePreservingEnds,
} from './adjudicate_iocs';

// extract_iocs now locates the source span and builds `context` at extraction
// time (it already has the offset of every occurrence), so adjudication only
// ever consumes a candidate's own `context` — it never re-finds a value in the
// article. Fixtures below set `context` directly rather than deriving it from
// article text.
const candidate = (value: string, overrides: Partial<ExtractedIoc> = {}): ExtractedIoc => ({
  type: 'url',
  value,
  defanged: value,
  tier: 'uncertain',
  tier_heuristic: 'uncertain',
  tier_basis: 'uncertain_default',
  context: `The attacker downloaded ${value} during the campaign.`,
  ...overrides,
});

describe('prepareIocAdjudication and reconcileIocAdjudication', () => {
  it('sends Markdown link destinations to semantic review', () => {
    // Jina renders attacker payload URLs as Markdown links too. Auto-downgrading
    // every `](url)` destination would drop real IOCs before the model sees them.
    const payload = 'https://evil.example/payload';
    const citation = 'https://attack.mitre.org/techniques/T1059/';
    const prepared = prepareIocAdjudication({
      article_url: 'https://www.elastic.co/security-labs/example',
      iocs: [
        candidate(payload, { context: `The attacker downloaded [the payload](${payload}).` }),
        candidate(citation, { context: `See [ATT&CK](${citation}) for background.` }),
      ],
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
      article_url: 'https://research.example/current-post',
      iocs: [candidate('https://research.example/another-post')],
    });
    const result = reconcileIocAdjudication(prepared, new Set());

    expect(result.iocs[0].tier).toBe('reference');
    expect(result.adjudication.deterministic_references).toBe(1);
    expect(prepared.reviewable).toHaveLength(0);
  });

  it('sends non-origin URL candidates to semantic review and applies verdicts by candidate id', () => {
    const malicious = candidate('https://evil.example/payload');
    const documentation = candidate('https://docs.example/product');
    const prepared = prepareIocAdjudication({ iocs: [malicious, documentation] });
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
    expect(result.anchor_iocs).toHaveLength(1);
    expect(result.promotable_count).toBe(1);
    expect(result.ioc_set_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('preserves deterministic non-URL indicators without semantic review', () => {
    const hash = 'a'.repeat(64);
    const prepared = prepareIocAdjudication({
      iocs: [
        candidate(hash, {
          type: 'hash',
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'hash_high_entropy',
          context: undefined,
        }),
      ],
    });
    const result = reconcileIocAdjudication(prepared, new Set());

    expect(result.iocs[0].tier).toBe('discriminating');
    expect(result.promotable_count).toBe(1);
    expect(prepared.reviewable).toHaveLength(0);
  });

  it('defers a candidate with an empty context instead of sending it', () => {
    // extract_iocs never located this value's occurrence in the article
    // (context stays '') — sending it anyway would produce a predictable model
    // rejection indistinguishable from a real semantic_reference verdict.
    const prepared = prepareIocAdjudication({
      iocs: [
        candidate('https://evil.example/', {
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'url_path_entropy',
          context: '',
        }),
      ],
    });

    expect(prepared.reviewable).toHaveLength(0);
    expect(prepared.deferredUnreviewed).toBe(1);

    const adjudicated = reconcileIocAdjudication(prepared, new Set());
    expect(adjudicated.iocs[0].tier).toBe('discriminating');
    expect(adjudicated.iocs[0].deferred_unreviewed).toBe(true);
    expect(adjudicated.anchor_iocs).toHaveLength(0);
    expect(adjudicated.adjudication.deferred_unreviewed).toBe(1);
  });

  it('strips context from every output IOC, not just reviewed ones', () => {
    // extracted.iocs is a dynamic: strict nested mapping that does not declare
    // `context`; persist_extractions would fail if it leaked through.
    const reviewed = candidate('https://evil.example/payload');
    const deterministic = candidate('https://research.example/another-post');
    const hash = candidate('a'.repeat(64), {
      type: 'hash',
      tier: 'discriminating',
      tier_heuristic: 'discriminating',
      tier_basis: 'hash_high_entropy',
    });
    const prepared = prepareIocAdjudication({
      article_url: 'https://research.example/current-post',
      iocs: [reviewed, deterministic, hash],
    });
    const result = reconcileIocAdjudication(prepared, new Set([0]));

    for (const ioc of result.iocs) {
      expect(ioc).not.toHaveProperty('context');
    }
  });

  it('keeps an approved tier_basis within the response schema bound', () => {
    const longBasis = 'b'.repeat(MAX_IOC_TIER_BASIS_LENGTH);
    const prepared = prepareIocAdjudication({
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
    const prepared = prepareIocAdjudication({ iocs });
    const bounded = boundIocAdjudicationForOverflow(prepared);
    const result = reconcileIocAdjudication(bounded, new Set([0]));

    expect(bounded.reviewable).toHaveLength(OVERFLOW_MAX_SEMANTIC_CANDIDATES);
    expect(bounded.deferredUnreviewed).toBe(10);
    expect(bounded.reviewable.every((entry) => entry.context.length <= 120)).toBe(true);
    // Skipped candidates keep their heuristic tier; only reviewed IDs are verdicted.
    expect(result.iocs[OVERFLOW_MAX_SEMANTIC_CANDIDATES].tier).toBe('discriminating');
    expect(result.adjudication.deferred_unreviewed).toBe(10);
    // Deferred URL/domain IOCs stay out of anchors until reviewed.
    expect(
      result.anchor_iocs.some((ioc) => ioc.value === iocs[OVERFLOW_MAX_SEMANTIC_CANDIDATES].value)
    ).toBe(false);
  });

  it('centers overflow context on the IOC instead of taking a leading prefix', () => {
    const url = 'https://evil.example/payload';
    const context = `${'leading attribution prose '.repeat(20)}${url} trailing notes`;
    const prepared = prepareIocAdjudication({ iocs: [candidate(url, { context })] });
    expect(prepared.reviewable[0].context.length).toBeGreaterThan(120);

    const bounded = boundIocAdjudicationForOverflow(prepared);

    expect(bounded.reviewable[0].context.length).toBeLessThanOrEqual(120);
    expect(bounded.reviewable[0].context).toContain(url);
  });

  it('keeps attribution prose when an overflow window is shorter than the URL', () => {
    const url = `https://evil.example/${'a'.repeat(200)}`;
    const context = `The attacker downloaded ${url} during exfiltration.`;
    const prepared = prepareIocAdjudication({ iocs: [candidate(url, { context })] });
    const bounded = boundIocAdjudicationForOverflow(prepared, 1, 80);

    expect(bounded.reviewable[0].context.length).toBeLessThanOrEqual(80);
    expect(bounded.reviewable[0].context).toContain('attacker downloaded');
    expect(bounded.reviewable[0].context).toContain('https://evil.example/');
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
    const prepared = prepareIocAdjudication({ iocs });
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

  it('does not treat a different port as the same origin citation', () => {
    const prepared = prepareIocAdjudication({
      article_url: 'https://blog.example/article',
      iocs: [candidate('https://blog.example:8443/payload')],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.deterministicReferences).toBe(0);
  });

  it('does not treat http and https as the same origin citation', () => {
    const prepared = prepareIocAdjudication({
      article_url: 'https://blog.example/article',
      iocs: [candidate('http://blog.example/payload')],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.deterministicReferences).toBe(0);
  });

  it('applies the semantic review budget before batching', () => {
    const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
    const total = capacity + 25;
    const iocs = Array.from({ length: total }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const prepared = prepareIocAdjudication({ iocs });

    expect(prepared.reviewable).toHaveLength(capacity);
    expect(prepared.deferredUnreviewed).toBe(25);
    // Deferred IOCs stay on the heuristic tier and are absent from reviewable.
    expect(prepared.output[capacity].tier).toBe('discriminating');
    expect(prepared.reviewable.some((entry) => entry.id === capacity)).toBe(false);
  });

  it('shrinks candidate payload by size on a second overflow retry', () => {
    const iocs = Array.from({ length: OVERFLOW_MAX_SEMANTIC_CANDIDATES }, (_, index) =>
      candidate(`https://evil.example/${'a'.repeat(1_800)}-${index}`)
    );
    const prepared = prepareIocAdjudication({ iocs });
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

  it('marks a retry-2 rejection with a degraded tier_basis, not semantic_reference', () => {
    const iocs = Array.from({ length: OVERFLOW_MAX_SEMANTIC_CANDIDATES }, (_, index) =>
      candidate(`https://evil.example/${'a'.repeat(1_800)}-${index}`)
    );
    const prepared = prepareIocAdjudication({ iocs });
    const second = boundIocAdjudicationForPayload(boundIocAdjudicationForOverflow(prepared));

    expect(second.reviewable.every((candidateEntry) => candidateEntry.degraded)).toBe(true);

    const adjudicated = reconcileIocAdjudication(second, new Set());
    const rejected = second.reviewable.map((candidateEntry) => candidateEntry.originalIndex);
    for (const index of rejected) {
      expect(adjudicated.iocs[index].tier_basis).toBe('semantic_reference_degraded');
    }
  });

  it('keeps long URL suffixes distinguishable after payload truncation', () => {
    const prefix = `https://evil.example/${'a'.repeat(1_800)}`;
    const left = `${prefix}-LEFT_UNIQUE`;
    const right = `${prefix}-RIGHT_UNIQUE`;
    const iocs = [candidate(left), candidate(right)];
    const prepared = prepareIocAdjudication({ iocs });
    const second = boundIocAdjudicationForPayload(boundIocAdjudicationForOverflow(prepared));

    expect(second.reviewable).toHaveLength(2);
    expect(second.reviewable[0].ioc.value).not.toBe(second.reviewable[1].ioc.value);
    expect(second.reviewable[0].ioc.value).toContain('LEFT_UNIQUE');
    expect(second.reviewable[1].ioc.value).toContain('RIGHT_UNIQUE');
    expect(second.reviewable[0].ioc.value.length).toBeLessThanOrEqual(
      OVERFLOW_RETRY2_MAX_VALUE_CHARS
    );
  });

  it('defers remaining prompt collisions instead of sending identical copies', () => {
    // Differ only in the omitted middle so end-preserving truncation collides.
    const head = 'H'.repeat(128);
    const midA = 'A'.repeat(800);
    const midB = 'B'.repeat(800);
    const tail = 'T'.repeat(127);
    const left = `${head}${midA}${tail}`;
    const right = `${head}${midB}${tail}`;
    const truncatedLeft = truncateValuePreservingEnds(left, OVERFLOW_RETRY2_MAX_VALUE_CHARS);
    const truncatedRight = truncateValuePreservingEnds(right, OVERFLOW_RETRY2_MAX_VALUE_CHARS);
    expect(truncatedLeft).toBe(truncatedRight);

    const iocs = [
      candidate(`https://evil.example/${left}`),
      candidate(`https://evil.example/${right}`),
    ];
    // Re-check with the scheme prefix included in the truncated form.
    const withSchemeLeft = truncateValuePreservingEnds(
      iocs[0].value,
      OVERFLOW_RETRY2_MAX_VALUE_CHARS
    );
    const withSchemeRight = truncateValuePreservingEnds(
      iocs[1].value,
      OVERFLOW_RETRY2_MAX_VALUE_CHARS
    );
    expect(withSchemeLeft).toBe(withSchemeRight);

    const prepared = prepareIocAdjudication({ iocs });
    const second = boundIocAdjudicationForPayload(boundIocAdjudicationForOverflow(prepared));

    expect(second.reviewable).toHaveLength(1);
    expect(second.deferredUnreviewed).toBeGreaterThanOrEqual(1);
  });

  it('excludes deferred URL candidates from anchors until reviewed', () => {
    const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
    const iocs = Array.from({ length: capacity + 5 }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const hash = candidate('a'.repeat(64), {
      type: 'hash',
      tier: 'discriminating',
      tier_heuristic: 'discriminating',
      tier_basis: 'hash_high_entropy',
      context: undefined,
    });
    const all = [...iocs, hash];
    const prepared = prepareIocAdjudication({ iocs: all });
    const approved = new Set(prepared.reviewable.map((entry) => entry.id));
    const result = reconcileIocAdjudication(prepared, approved);

    expect(prepared.deferredUnreviewed).toBe(5);
    expect(result.iocs[capacity].tier).toBe('discriminating');
    expect(result.iocs[capacity].deferred_unreviewed).toBe(true);
    expect(result.anchor_iocs.some((ioc) => ioc.value === iocs[capacity].value)).toBe(false);
    expect(result.anchor_iocs.some((ioc) => ioc.type === 'hash')).toBe(true);
    expect(result.promotable_count).toBe(capacity + 1);
  });

  it('keeps ioc_set_hash independent of deferred anchors', () => {
    const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
    const iocs = Array.from({ length: capacity + 5 }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const prepared = prepareIocAdjudication({ iocs });
    const approved = new Set(prepared.reviewable.map((entry) => entry.id));
    const result = reconcileIocAdjudication(prepared, approved, {
      correlationHash: hashIocSet(iocs),
    });

    expect(result.ioc_set_hash).toBe(hashIocSet(iocs));
    expect(result.adjudication.deferred_unreviewed).toBe(5);
    expect(result.anchor_iocs).toHaveLength(capacity);
  });
});
