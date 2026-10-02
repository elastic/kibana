/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';

import {
  hasCompleteFinding,
  loggingClassificationRt,
  MAX_FINDING_SUMMARY_LENGTH,
  MAX_FINDING_TITLE_LENGTH,
  otelClassificationRt,
} from './classification_codec';

const finding = {
  findingSummary: 'The warning logs the generated admin password in clear text.',
  findingTitle: 'Admin password written to the log',
  findingType: 'sensitive-data' as const,
};

describe.each([
  ['loggingClassificationRt', loggingClassificationRt],
  ['otelClassificationRt', otelClassificationRt],
])('%s finding fields', (_name, codec) => {
  it('accepts a kept result with all 3 finding fields', () => {
    const decoded = codec.decode({ id: 'src/app.ts:1', keep: true, ...finding });

    expect(isRight(decoded)).toBe(true);
    expect(isRight(decoded) && hasCompleteFinding(decoded.right)).toBe(true);
  });

  it('accepts a rejected result that still carries a finding', () => {
    expect(isRight(codec.decode({ id: 'src/app.ts:1', keep: false, ...finding }))).toBe(true);
  });

  it('accepts a result without any finding field', () => {
    const decoded = codec.decode({ id: 'src/app.ts:1', keep: true });

    expect(isRight(decoded)).toBe(true);
    expect(isRight(decoded) && hasCompleteFinding(decoded.right)).toBe(false);
  });

  it.each([
    ['only findingType', { findingType: finding.findingType }],
    ['only findingTitle', { findingTitle: finding.findingTitle }],
    ['type and title', { findingType: finding.findingType, findingTitle: finding.findingTitle }],
    [
      'title and summary',
      { findingTitle: finding.findingTitle, findingSummary: finding.findingSummary },
    ],
  ])('rejects a result with %s', (_label, partial) => {
    expect(isRight(codec.decode({ id: 'src/app.ts:1', keep: true, ...partial }))).toBe(false);
  });

  it.each(['bug', 'odd'])('rejects the %s finding type', (findingType) => {
    expect(isRight(codec.decode({ id: 'src/app.ts:1', keep: true, ...finding, findingType }))).toBe(
      false
    );
  });

  it.each([
    ['title', { findingTitle: 'a'.repeat(MAX_FINDING_TITLE_LENGTH + 1) }],
    ['summary', { findingSummary: 'a'.repeat(MAX_FINDING_SUMMARY_LENGTH + 1) }],
  ])('rejects an over-length finding %s', (_label, overLength) => {
    expect(
      isRight(codec.decode({ id: 'src/app.ts:1', keep: true, ...finding, ...overLength }))
    ).toBe(false);
  });

  it('accepts titles and summaries at their maximum length', () => {
    expect(
      isRight(
        codec.decode({
          id: 'src/app.ts:1',
          keep: true,
          findingType: 'sensitive-data',
          findingTitle: 'a'.repeat(MAX_FINDING_TITLE_LENGTH),
          findingSummary: 'a'.repeat(MAX_FINDING_SUMMARY_LENGTH),
        })
      )
    ).toBe(true);
  });
});
