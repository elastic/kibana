/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file except in compliance with the Elastic
 * License 2.0.
 */

import { partialResponseContainsJson } from '.';

describe('partialResponseContainsJson', () => {
  describe('first response (nothing accumulated)', () => {
    const accumulatedJson = '';

    it('returns true for a JSON object', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '{"insights": [{"title": "Chain',
          accumulatedJson,
        })
      ).toBe(true);
    });

    it('returns true for a JSON array', () => {
      expect(
        partialResponseContainsJson({ partialResponse: '  [{"a": 1}]', accumulatedJson })
      ).toBe(true);
    });

    it('returns false for reasoning prose that opens with a markdown heading', () => {
      expect(
        partialResponseContainsJson({
          partialResponse:
            '## Reasoning\n\n**Shared entities: confirmed.** All 4 alerts share {{ host.name wks-alice-01 }}.',
          accumulatedJson,
        })
      ).toBe(false);
    });

    it('returns false for reasoning prose that opens with a bold label', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '**Step 1: Schema compliance.** No stray fields.',
          accumulatedJson,
        })
      ).toBe(false);
    });

    it('returns false for unheaded reasoning prose', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: 'The alerts share a host and a user, so they form one chain.',
          accumulatedJson,
        })
      ).toBe(false);
    });

    it('returns false for a numbered list of reasoning', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '1. Shared entities: all alerts share wks-alice-01.',
          accumulatedJson,
        })
      ).toBe(false);
    });

    it('returns false for an empty partial', () => {
      expect(partialResponseContainsJson({ partialResponse: '', accumulatedJson })).toBe(false);
    });
  });

  describe('continuation (JSON already accumulated)', () => {
    const accumulatedJson = '{"insights": [{"title": "Chain", "detailsMarkdown": "The attacker';

    it('returns true for a fragment that starts mid-document', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: 'tle": "PowerShell Stager",\n      "alertIds": [',
          accumulatedJson,
        })
      ).toBe(true);
    });

    it('returns true for a fragment that opens with bold markdown inside an open string', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '**det** and beacons to the C2 server"}]}',
          accumulatedJson,
        })
      ).toBe(true);
    });

    it('returns true for a fragment that opens with a markdown heading inside an open string', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '# Impact\n- host isolated"}]}',
          accumulatedJson,
        })
      ).toBe(true);
    });

    it('returns false for reasoning prose that opens with a heading or bold label', () => {
      expect(
        partialResponseContainsJson({
          partialResponse: '## Reasoning\n\nThe alerts share a host.',
          accumulatedJson,
        })
      ).toBe(false);
      expect(
        partialResponseContainsJson({
          partialResponse: '**Step 1: Schema compliance.** No stray fields.',
          accumulatedJson,
        })
      ).toBe(false);
    });

    it('returns false for an empty partial', () => {
      expect(partialResponseContainsJson({ partialResponse: '', accumulatedJson })).toBe(false);
    });
  });
});
