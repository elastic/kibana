/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNarrativeText, countDistinctClaims } from './narrative_claims';

describe('narrative_claims', () => {
  describe('getNarrativeText', () => {
    it('extracts assistant narrative text', () => {
      const text = getNarrativeText({
        steps: [{ type: 'llm', output: { content: 'I corroborated 4 events' } }],
      });
      expect(text).toContain('corroborated 4 events');
    });

    it('excludes tool output payloads (the 153-match spike regression)', () => {
      // Regression: /corroborat/gi over JSON.stringify(response) counted
      // substring hits inside ES|QL result rows.
      const text = getNarrativeText({
        steps: [
          {
            type: 'tool',
            output: { rows: Array.from({ length: 153 }, () => 'corroborating row') },
          },
          { type: 'llm', output: { content: 'Found corroborating evidence' } },
        ],
      });
      expect(text).not.toContain('corroborating row');
      expect(text).toContain('Found corroborating evidence');
      expect(countDistinctClaims(text, /corroborat\w*/gi)).toBe(1);
    });

    it('handles string content and content-part arrays', () => {
      expect(getNarrativeText({ output: 'plain string' })).toBe('plain string');
      expect(getNarrativeText({ output: { content: [{ text: 'a' }, { text: 'b' }] } })).toContain(
        'a\nb'
      );
    });

    it('returns empty string for empty responses', () => {
      expect(getNarrativeText({})).toBe('');
      expect(getNarrativeText({ steps: [] })).toBe('');
    });
  });

  describe('countDistinctClaims', () => {
    it('collapses repeated headings case-insensitively (gapIdentification regression)', () => {
      // Regression: "Gap", "gap", "Gaps" headings counted as 3+ mentions.
      const text = '## Gaps\nGap 1: ...\n## gaps\ngap 2: ...';
      expect(countDistinctClaims(text, /gap\w*/gi)).toBe(2); // "gaps", "gap"
    });

    it('returns 0 on no matches', () => {
      expect(countDistinctClaims('nothing here', /corroborat\w*/gi)).toBe(0);
    });

    it('counts distinct corroborate-family terms separately', () => {
      expect(
        countDistinctClaims('corroborated, corroborating, corroboration', /corroborat\w*/gi)
      ).toBe(3);
    });

    it('deduplicates repeated identical claim terms (mutation guard: .length ≠ distinct)', () => {
      // Regression: dedup is term-level — the same word repeated 4× is ONE
      // distinct claim type; a plain substring count returns 4 here.
      const text =
        'corroborated A. corroborated A again. corroborated A once more. corroborated B.';
      expect(countDistinctClaims(text, /corroborat\w*/gi)).toBe(1);
    });
  });
});
