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
    // Deferred URL/domain IOCs stay out of anchors until reviewed.
    expect(
      result.anchor_iocs.some((ioc) => ioc.value === iocs[OVERFLOW_MAX_SEMANTIC_CANDIDATES].value)
    ).toBe(false);
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

  it('keeps case-sensitive URL path contexts distinct in the cache', () => {
    const upper = 'https://evil.example/PAYLOAD';
    const lower = 'https://evil.example/payload';
    const prepared = prepareIocAdjudication({
      text:
        `The attacker staged ${upper} during initial access. ` +
        `${'filler prose. '.repeat(40)}` +
        `Documentation casually mentions ${lower} as an older sample name.`,
      iocs: [candidate(upper), candidate(lower)],
    });

    expect(prepared.reviewable).toHaveLength(2);
    expect(prepared.reviewable[0].context).toContain('attacker staged');
    expect(prepared.reviewable[0].context).not.toContain('Documentation casually');
    expect(prepared.reviewable[1].context).toContain('Documentation casually');
    expect(prepared.reviewable[1].context).not.toContain('attacker staged');
  });

  it('matches URL review context with case-insensitive hosts and exact paths', () => {
    const url = 'https://evil.example/PAYLOAD';
    const prepared = prepareIocAdjudication({
      text: 'The attacker downloaded https://Evil.Example/PAYLOAD during staging.',
      iocs: [candidate(url)],
    });

    expect(prepared.reviewable[0].context).toContain('attacker downloaded');
    expect(prepared.reviewable[0].context).toContain('/PAYLOAD');
  });

  it('matches bare host URLs when the source omits the normalized trailing slash', () => {
    const url = 'https://evil.example/';
    const prepared = prepareIocAdjudication({
      text: 'The attacker beaconed to https://evil.example during exfiltration.',
      iocs: [candidate(url)],
    });

    expect(prepared.reviewable[0].context).toContain('attacker beaconed');
    expect(prepared.reviewable[0].context).toContain('https://evil.example');
  });

  it('matches a bare host URL before a sentence-final period', () => {
    const prepared = prepareIocAdjudication({
      text: 'The attacker beaconed to https://evil.example.',
      iocs: [candidate('https://evil.example/')],
    });

    expect(prepared.reviewable[0].context).toContain('attacker beaconed');
  });

  it('does not treat a longer hostname as a bare-host match', () => {
    const prepared = prepareIocAdjudication({
      text: 'Docs mention https://evil.example.other as a CDN hostname.',
      iocs: [candidate('https://evil.example/')],
    });

    expect(prepared.reviewable[0].context).not.toContain('CDN hostname');
    expect(prepared.reviewable[0].context).toBe('');
  });

  it('does not reuse path or port evidence for a bare-host candidate', () => {
    const prepared = prepareIocAdjudication({
      text:
        'The attacker staged https://evil.example/payload.bin during access. ' +
        'Later the panel listened on https://evil.example:8443.',
      iocs: [candidate('https://evil.example/')],
    });

    expect(prepared.reviewable[0].context).toBe('');
  });

  it('does not attribute a shorter path to a longer path suffix', () => {
    const shortUrl = 'https://evil.example/payload';
    const prepared = prepareIocAdjudication({
      text:
        'Docs list https://evil.example/payload as a reference. ' +
        `${'filler prose. '.repeat(40)}` +
        'The attacker later downloaded https://evil.example/payload.exe.',
      iocs: [candidate(shortUrl)],
    });

    expect(prepared.reviewable[0].context).toContain('Docs list');
    expect(prepared.reviewable[0].context).not.toContain('attacker later downloaded');
  });

  it('matches percent-encoded URL candidates against Unicode source spelling', () => {
    const prepared = prepareIocAdjudication({
      text: 'The attacker staged https://evil.com/café during exfiltration.',
      iocs: [candidate('https://evil.com/caf%C3%A9')],
    });

    expect(prepared.reviewable[0].context).toContain('attacker staged');
    expect(prepared.reviewable[0].context).toContain('café');
  });

  it('does not treat percent-encoded reserved path bytes as a different URL path', () => {
    const prepared = prepareIocAdjudication({
      text:
        'Docs list https://evil.example/a%2Fb as a reference. ' +
        `${'filler prose. '.repeat(40)}` +
        'The attacker later downloaded https://evil.example/a/b.',
      iocs: [candidate('https://evil.example/a%2Fb')],
    });

    expect(prepared.reviewable[0].context).toContain('Docs list');
    expect(prepared.reviewable[0].context).not.toContain('attacker later downloaded');
  });

  it('requires whole-hostname boundaries for domain review context', () => {
    const prepared = prepareIocAdjudication({
      text:
        'Docs mention evil.com in passing. ' +
        `${'filler prose. '.repeat(40)}` +
        'The attacker later used not-evil.com for C2.',
      iocs: [
        candidate('evil.com', {
          type: 'domain',
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'defanged_source',
        }),
      ],
    });

    expect(prepared.reviewable[0].context).toContain('Docs mention');
    expect(prepared.reviewable[0].context).not.toContain('attacker later used');
  });

  it('does not treat a longer FQDN as a domain match', () => {
    const prepared = prepareIocAdjudication({
      text: 'The attacker used evil.com.au for staging.',
      iocs: [
        candidate('evil.com', {
          type: 'domain',
          tier: 'discriminating',
          tier_heuristic: 'discriminating',
          tier_basis: 'defanged_source',
        }),
      ],
    });

    expect(prepared.reviewable[0].context).toBe('');
  });

  it('does not treat a different port as the same origin citation', () => {
    const prepared = prepareIocAdjudication({
      text: 'Payload mirrored at https://blog.example:8443/payload',
      article_url: 'https://blog.example/article',
      iocs: [candidate('https://blog.example:8443/payload')],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.deterministicReferences).toBe(0);
  });

  it('does not treat http and https as the same origin citation', () => {
    const prepared = prepareIocAdjudication({
      text: 'See http://blog.example/payload for the binary.',
      article_url: 'https://blog.example/article',
      iocs: [candidate('http://blog.example/payload')],
    });

    expect(prepared.reviewable).toHaveLength(1);
    expect(prepared.deterministicReferences).toBe(0);
  });

  it('applies the semantic review budget before building review contexts', () => {
    const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
    const total = capacity + 25;
    const iocs = Array.from({ length: total }, (_, index) =>
      candidate(`https://evil.example/payload-${index}`, {
        tier: 'discriminating',
        tier_heuristic: 'discriminating',
        tier_basis: 'url_path_entropy',
      })
    );
    const text = iocs.map((ioc) => `C2 fetched ${ioc.value}.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs });

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

  it('keeps long URL suffixes distinguishable after payload truncation', () => {
    const prefix = `https://evil.example/${'a'.repeat(1_800)}`;
    const left = `${prefix}-LEFT_UNIQUE`;
    const right = `${prefix}-RIGHT_UNIQUE`;
    const iocs = [candidate(left), candidate(right)];
    const text = `Fetched ${left} then ${right}.`;
    const prepared = prepareIocAdjudication({ text, iocs });
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

    const text = `Fetched ${iocs[0].value} then ${iocs[1].value}.`;
    const prepared = prepareIocAdjudication({ text, iocs });
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
    });
    const all = [...iocs, hash];
    const text = all.map((ioc) => `Seen ${ioc.value}.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs: all });
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
    const text = iocs.map((ioc) => `Seen ${ioc.value}.`).join(' ');
    const prepared = prepareIocAdjudication({ text, iocs });
    const approved = new Set(prepared.reviewable.map((entry) => entry.id));
    const result = reconcileIocAdjudication(prepared, approved, {
      correlationHash: hashIocSet(iocs),
    });

    expect(result.ioc_set_hash).toBe(hashIocSet(iocs));
    expect(result.adjudication.deferred_unreviewed).toBe(5);
    expect(result.anchor_iocs).toHaveLength(capacity);
  });
});
