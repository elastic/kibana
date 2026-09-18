/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNarrativeText, countClaimUnits, splitClaimUnits } from './narrative_claims';

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
      expect(countClaimUnits(text, /corroborat\w*/gi)).toBe(1);
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

  describe('splitClaimUnits', () => {
    it('splits on lines and on sentence boundaries within a line', () => {
      expect(splitClaimUnits('One claim.\nAnother claim.')).toEqual([
        'One claim.',
        'Another claim.',
      ]);
      expect(splitClaimUnits('First. Second; Third!')).toEqual(['First.', 'Second; Third!']);
      expect(splitClaimUnits('   \n\n  ')).toEqual([]);
    });
  });

  describe('countClaimUnits', () => {
    it('counts three stage bullets as three corroborated events (same verb form)', () => {
      // Regression, false-failure direction: `corroborated` appears in three
      // separate stage entries — three distinct corroborated events — but the
      // old distinct-WORD-FORM count returned 1, so a correct report failed
      // the dataset's `minCorroboratedCount`.
      const text = [
        '- Stage: initial-access — corroborated by outlook.exe spawning powershell.exe',
        '- Stage: execution — corroborated by the encoded download cradle',
        '- Stage: command-and-control — corroborated by the 192.168.1.50:443 beacon',
      ].join('\n');

      expect(countClaimUnits(text, /corroborat\w*/gi)).toBe(3);
    });

    it('counts one hedged sentence as one claim even when it uses three word forms', () => {
      // Regression, false-pass direction: one sentence reusing
      // corroborated/corroborating/corroboration scored 3 under the old metric,
      // satisfying a depth bound the report did not actually meet.
      const text = 'The corroborating evidence is limited; nothing was corroborated.';

      expect(countClaimUnits(text, /corroborat\w*/gi)).toBe(1);
      expect(countClaimUnits('corroborated, corroborating, corroboration', /corroborat\w*/gi)).toBe(
        1
      );
    });

    it('counts repeated gaps in one line separately, but a repeated heading once', () => {
      // Two gap entries are two claims; a heading that repeats the word twice
      // in the same unit is one.
      expect(countClaimUnits('Gap 1: no WMI telemetry. Gap 2: no beacon.', /gap\w*/gi)).toBe(2);
      expect(countClaimUnits('## Gaps and gaps', /gap\w*/gi)).toBe(1);
    });

    it('returns 0 on no matches', () => {
      expect(countClaimUnits('nothing here', /corroborat\w*/gi)).toBe(0);
      expect(countClaimUnits('', /corroborat\w*/gi)).toBe(0);
    });

    it('does not leak regex lastIndex between units (shared /g pattern)', () => {
      const shared = /corroborat\w*/gi;
      const text = 'corroborated A. corroborated B. corroborated C.';

      expect(countClaimUnits(text, shared)).toBe(3);
      // Same pattern object, same answer — a stateful /g regex would drop
      // alternating matches on the second call.
      expect(countClaimUnits(text, shared)).toBe(3);
    });

    it('does not count a negated claim as a positive one', () => {
      // Regression, false-failure direction: `no-raw-telemetry` allows at most
      // ZERO corroborated stages, so a correct "No stages were corroborated"
      // used to count 1 and fail the bound it actually satisfied.
      expect(countClaimUnits('No stages were corroborated.', /corroborat\w*/gi)).toBe(0);
      expect(
        countClaimUnits('The narrative was not corroborated by any raw log.', /corroborat\w*/gi)
      ).toBe(0);
      expect(countClaimUnits('0 gaps identified.', /gap\w*/gi)).toBe(0);
      expect(countClaimUnits('No gaps were identified.', /gap\w*/gi)).toBe(0);
    });

    it('does not count an empty-list section as a claim', () => {
      // The other direction: `full-corroboration` allows at most ZERO gaps, and
      // a normal "Gaps: none" section used to count 1.
      expect(countClaimUnits('Gaps: none', /gap\w*/gi)).toBe(0);
      expect(countClaimUnits('Corroborated: none identified', /corroborat\w*/gi)).toBe(0);
      expect(countClaimUnits('Gaps found: zero', /gap\w*/gi)).toBe(0);
    });

    it('still counts a claim whose heading describes what is absent', () => {
      // The negation guard must stay narrow: "Gap 1: no WMI telemetry" asserts a
      // gap EXISTS and explains what is missing from it.
      expect(countClaimUnits('Gap 1: no WMI telemetry', /gap\w*/gi)).toBe(1);
      expect(
        countClaimUnits('Corroborated: the beacon, despite no DNS telemetry', /corroborat\w*/gi)
      ).toBe(1);
    });

    it('counts the positive claims around a negative one', () => {
      const text = [
        'No stages were corroborated for WKSTN-EVAL03.',
        'Corroborated: initial-access on WKSTN-EVAL01.',
        'Gaps: none',
      ].join('\n');

      expect(countClaimUnits(text, /corroborat\w*/gi)).toBe(1);
      expect(countClaimUnits(text, /gap\w*/gi)).toBe(0);
    });
  });
});
