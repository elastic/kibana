/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import { escalationCases } from './dataset';
import {
  containsToken,
  groundTruthCorpus,
  keyMentionRecall,
  unsupportedNumericSpecifics,
} from './grading';

const case01 = escalationCases[0];

describe('keyMentionRecall', () => {
  it('scores 1 when every fact key appears in the text', () => {
    const allText = case01.investigations
      .flatMap((inv) => inv.events.map((e) => Object.values(e.data).join(' ')))
      .join(' ');
    const result = keyMentionRecall(allText, case01.plantedFacts);
    expect(result.score).toBe(1);
    expect(result.missed).toEqual([]);
  });

  it('scores 0 when nothing appears', () => {
    expect(keyMentionRecall('Unrelated summary text.', case01.plantedFacts).score).toBe(0);
  });

  it('is case-insensitive', () => {
    const result = keyMentionRecall('beacons to 203.0.113.44 every 30s', case01.plantedFacts);
    expect(result.hit).toContain('f4');
  });

  it('missing text is a zero, not a one', () => {
    expect(keyMentionRecall(undefined, case01.plantedFacts).score).toBe(0);
  });
});

describe('unsupportedNumericSpecifics', () => {
  it('flags sentences with specifics absent from the corpus', () => {
    const corpus = groundTruthCorpus(case01);
    const result = unsupportedNumericSpecifics(
      'WEB01 fetched from 198.51.100.7. The attacker then moved to 10.9.9.9 and dumped LSASS with pypykatz.',
      corpus
    );
    expect(result.count).toBeGreaterThan(0);
    expect(result.sentences.join(' ')).toContain('10.9.9.9');
    expect(result.sentences.join(' ')).not.toContain('198.51.100.7');
  });

  it('finds nothing wrong in a faithful summary', () => {
    const corpus = groundTruthCorpus(case01);
    const faithful =
      'WEB01 downloaded a second stage from 198.51.100.7. svc_backup was Kerberoasted on DC01. WEB01 later beaconed to 203.0.113.44:8443.';
    expect(unsupportedNumericSpecifics(faithful, corpus).count).toBe(0);
  });

  it('handles empty summaries', () => {
    expect(unsupportedNumericSpecifics(undefined, 'corpus')).toEqual({
      count: 0,
      sentences: [],
      graded: 0,
    });
  });
});

describe('mutation: dropping the last investigation must reduce recall', () => {
  it('recall falls when the last investigation is dropped', () => {
    for (const c of escalationCases) {
      const last = c.investigations.length - 1;
      // A "perfect" summary: the full text of every investigation.
      const full = c.investigations
        .flatMap((inv) => inv.events.map((e) => Object.values(e.data).join(' ')))
        .join('\n');
      const baseline = keyMentionRecall(full, c.plantedFacts);
      const mutated = keyMentionRecall(full, c.plantedFacts, {
        skipInvestigation: last,
      });
      expect(baseline.score).toBe(1);
      // The last-investigation fact is no longer gradeable, so the perfect
      // score is over fewer facts — but the *dropped fact count* is the point:
      expect(mutated.hit).not.toContain(c.plantedFacts.find((f) => f.investigation === last)!.id);
      // A summary that only covered the remaining investigations now reads as
      // perfect while missing the canary — so grade against the FULL label set:
      const withoutLastText = c.investigations
        .filter((_, index) => index !== last)
        .flatMap((inv) => inv.events.map((e) => Object.values(e.data).join(' ')))
        .join('\n');
      const recallVsFullLabels = keyMentionRecall(withoutLastText, c.plantedFacts);
      expect(recallVsFullLabels.score).toBeLessThan(1);
      expect(recallVsFullLabels.missed.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('hallucination grading uses the remaining corpus after the drop', () => {
    const c = case01;
    const last = c.investigations.length - 1;
    const summary = 'WEB01 beaconed to 203.0.113.44:8443 every 30 seconds.';
    const fullCorpus = groundTruthCorpus(c);
    expect(unsupportedNumericSpecifics(summary, fullCorpus).count).toBe(0);
    const mutatedCorpus = groundTruthCorpus(c, { skipInvestigation: last });
    expect(unsupportedNumericSpecifics(summary, mutatedCorpus).count).toBe(1);
  });
});

describe('grader probes (review F10)', () => {
  const corpus = groundTruthCorpus(case01);

  describe('containsToken boundaries', () => {
    it.each([
      ['203.0.113.4 vs 203.0.113.44', 'beacon to 203.0.113.44:8443', '203.0.113.4', false],
      ['prefix-extended token', 'account xsvc_backup', 'svc_backup', false],
      ['suffix-extended dotted token', 'host 198.51.100.7.evil.example', '198.51.100.7', false],
      ['exact token', 'beacon to 203.0.113.44:8443', '203.0.113.44', true],
      ['sentence-ending period', 'fetched from 198.51.100.7.', '198.51.100.7', true],
      ['case-insensitive', 'KEY updatercore here', 'UpdaterCore', true],
    ])('%s', (_name, haystack, token, expected) => {
      expect(containsToken(haystack, token)).toBe(expected);
    });
  });

  it('probe 1: a bare key dump still scores recall 1 — recall is a mention metric, not grounding', () => {
    const dump = case01.plantedFacts.map((f) => f.key).join(', ');
    expect(keyMentionRecall(dump, case01.plantedFacts).score).toBe(1);
    // ...which is why ClaimGrounding (LLM) is the grounding gate; the dump has no claim to ground.
  });

  it('probe 2: a misattributed sentence passes the deterministic graders (documented limit)', () => {
    const misattributed = 'DC01 beaconed to 198.51.100.7 using the svc_backup account.';
    expect(keyMentionRecall(misattributed, case01.plantedFacts).hit).toEqual(
      expect.arrayContaining(['f1', 'f3'])
    );
    expect(unsupportedNumericSpecifics(misattributed, corpus).count).toBe(0);
  });

  it('probe 3: 203.0.113.4 does not satisfy the key 203.0.113.44 and counts as unsupported', () => {
    const wrongIp = 'WEB01 beaconed to 203.0.113.4 every 30 seconds.';
    expect(keyMentionRecall(wrongIp, case01.plantedFacts).hit).not.toContain('f4');
    const result = unsupportedNumericSpecifics(wrongIp, corpus);
    expect(result.count).toBe(1);
    expect(result.sentences[0]).toContain('203.0.113.4');
  });

  it('probe 4: a non-numeric invention is invisible to the numeric check (ClaimGrounding covers it)', () => {
    const invented = 'The attacker dumped LSASS with pypykatz and pivoted through the VPN.';
    expect(unsupportedNumericSpecifics(invented, corpus).count).toBe(0);
  });

  it('an invented numeric specific is counted even beside a grounded one', () => {
    const mixed = 'WEB01 fetched from 198.51.100.7 after logging in from 10.9.9.9.';
    expect(unsupportedNumericSpecifics(mixed, corpus).count).toBe(1);
  });
});
