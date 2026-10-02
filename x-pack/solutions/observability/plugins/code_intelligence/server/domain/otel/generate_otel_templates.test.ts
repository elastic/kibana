/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractOtelSignalsFromWindows } from './extract_otel_signals';
import { generateOtelTemplates } from './generate_otel_templates';

/** Supplies immutable scope metadata for generated attribute templates. */
const context = {
  extractorVersion: 'phase-3',
  repository: 'elastic/example',
  revision: 'a'.repeat(40),
};

/** Extracts the signals of one Go source line. */
const signalsFor = (source: string) =>
  extractOtelSignalsFromWindows([
    { content: `span.SetAttributes(${source})`, path: 'src/telemetry.go', startLine: 1 },
  ]);

/** Extracts one Go source line and renders its attribute queries. */
const attributeQueriesFor = (source: string): readonly string[] =>
  generateOtelTemplates({ context, signals: signalsFor(source) }).map(({ query }) => query);

describe('generateOtelTemplates attribute queries', () => {
  it('keeps the percentile template for a numeric measure', () => {
    expect(attributeQueriesFor('attribute.Int64("request.size", n)')).toEqual([
      'FROM traces*\n| WHERE attributes.request.size IS NOT NULL\n| STATS avg = AVG(attributes.request.size), max = MAX(attributes.request.size), p95 = PERCENTILE(attributes.request.size, 95)',
    ]);
  });

  it('groups an identifier-like integer instead of aggregating it', () => {
    expect(attributeQueriesFor('attribute.Int("fetch", i)')).toEqual([
      'FROM traces*\n| WHERE attributes.fetch IS NOT NULL\n| STATS count = COUNT(*) BY attributes.fetch',
    ]);
  });

  it.each([
    'attribute.Int("demo.payment.card_cvv", int(req.GetCreditCard().GetCreditCardCvv()))',
    'attribute.String("demo.payment.card_number", req.GetCreditCard().GetCreditCardNumber())',
    'attribute.String("auth.apiKey", key)',
    'attribute.String("shop.access_token", token)',
  ])('generates no template for a payment or credential key: %s', (source) => {
    expect(signalsFor(source).filter(({ templated }) => templated !== true)).toEqual([
      expect.objectContaining({ kind: 'attr_key' }),
    ]);
    expect(attributeQueriesFor(source)).toEqual([]);
  });

  it('does not treat token counts as credentials', () => {
    expect(attributeQueriesFor('attribute.Int("llm.input_tokens", n)')).toHaveLength(1);
  });
});
