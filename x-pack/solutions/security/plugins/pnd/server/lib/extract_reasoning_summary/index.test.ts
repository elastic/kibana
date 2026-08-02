/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractReasoningSummary } from '.';

describe('extractReasoningSummary', () => {
  it('returns the summary string when present', () => {
    expect(
      extractReasoningSummary({
        sections: [{ body: 'x', title: 'Attack discovery' }],
        summary: 'An attack discovery was created. Approve opening an investigation?',
      })
    ).toEqual('An attack discovery was created. Approve opening an investigation?');
  });

  it('returns an empty string for null', () => {
    expect(extractReasoningSummary(null)).toEqual('');
  });

  it('returns an empty string for undefined', () => {
    expect(extractReasoningSummary(undefined)).toEqual('');
  });

  it('returns an empty string for an empty object', () => {
    expect(extractReasoningSummary({})).toEqual('');
  });

  it('falls back to JSON when there is no summary field', () => {
    expect(extractReasoningSummary({ note: 'hello' })).toEqual('{"note":"hello"}');
  });

  it('ignores a non-string summary and falls back to JSON', () => {
    expect(extractReasoningSummary({ summary: 42 })).toEqual('{"summary":42}');
  });

  it('bounds an oversized summary to the row schema limit', () => {
    expect(extractReasoningSummary({ summary: 'a'.repeat(9000) })).toHaveLength(8192);
  });

  it('drops `sections` from the fallback rather than serializing the narrative (D3)', () => {
    expect(
      extractReasoningSummary({
        note: 'hello',
        sections: [{ body: 'the full attack narrative', title: 'Attack discovery' }],
      })
    ).toEqual('{"note":"hello"}');
  });

  it('returns an empty string when `sections` is all there was (D3)', () => {
    expect(
      extractReasoningSummary({
        sections: [{ body: 'the full attack narrative', title: 'Attack discovery' }],
      })
    ).toEqual('');
  });

  it('drops `sections` even when it is not the array the orchestrators emit (D3)', () => {
    expect(extractReasoningSummary({ sections: 'the full attack narrative' })).toEqual('');
  });

  it('keeps the summary when it is present alongside sections', () => {
    expect(
      extractReasoningSummary({
        sections: [{ body: 'the full attack narrative', title: 'Attack discovery' }],
        summary: 'Approve opening an investigation?',
      })
    ).toEqual('Approve opening an investigation?');
  });

  it('bounds an oversized fallback to the row schema limit', () => {
    expect(extractReasoningSummary({ note: 'a'.repeat(9000) })).toHaveLength(8192);
  });
});
