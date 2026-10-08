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
import { groundTruthCorpus, hallucinatedSentences, plantedFactRecall } from './grading';

const case01 = escalationCases[0];

describe('plantedFactRecall', () => {
  it('scores 1 when every fact key appears in the text', () => {
    const allText = case01.investigations
      .flatMap((inv) => inv.events.map((e) => Object.values(e.data).join(' ')))
      .join(' ');
    const result = plantedFactRecall(allText, case01.plantedFacts);
    expect(result.score).toBe(1);
    expect(result.missed).toEqual([]);
  });

  it('scores 0 when nothing appears', () => {
    expect(plantedFactRecall('Unrelated summary text.', case01.plantedFacts).score).toBe(0);
  });

  it('is case-insensitive', () => {
    const result = plantedFactRecall('beacons to 203.0.113.44 every 30s', case01.plantedFacts);
    expect(result.hit).toContain('f4');
  });

  it('missing text is a zero, not a one', () => {
    expect(plantedFactRecall(undefined, case01.plantedFacts).score).toBe(0);
  });
});

describe('hallucinatedSentences', () => {
  it('flags sentences with specifics absent from the corpus', () => {
    const corpus = groundTruthCorpus(case01);
    const result = hallucinatedSentences(
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
    expect(hallucinatedSentences(faithful, corpus).count).toBe(0);
  });

  it('handles empty summaries', () => {
    expect(hallucinatedSentences(undefined, 'corpus')).toEqual({
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
      const baseline = plantedFactRecall(full, c.plantedFacts);
      const mutated = plantedFactRecall(full, c.plantedFacts, {
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
      const recallVsFullLabels = plantedFactRecall(withoutLastText, c.plantedFacts);
      expect(recallVsFullLabels.score).toBeLessThan(1);
      expect(recallVsFullLabels.missed.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('hallucination grading uses the remaining corpus after the drop', () => {
    const c = case01;
    const last = c.investigations.length - 1;
    const summary = 'WEB01 beaconed to 203.0.113.44:8443 every 30 seconds.';
    const fullCorpus = groundTruthCorpus(c);
    expect(hallucinatedSentences(summary, fullCorpus).count).toBe(0);
    const mutatedCorpus = groundTruthCorpus(c, { skipInvestigation: last });
    expect(hallucinatedSentences(summary, mutatedCorpus).count).toBe(1);
  });
});
