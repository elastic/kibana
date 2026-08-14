/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { textToPdfBuffer, toPdfSafeText } from './rum_report_pdf';

describe('toPdfSafeText', () => {
  it('maps bullets and arrows to ASCII', () => {
    expect(toPdfSafeText('Period: a → b\n• Sessions: 10')).toBe('Period: a -> b\n- Sessions: 10');
  });
});

describe('textToPdfBuffer', () => {
  it('builds a PDF without replacing ASCII content with question marks', () => {
    const pdf = textToPdfBuffer('# Weekly UX scorecard\n- Sessions: 10').toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('Weekly UX scorecard');
    expect(pdf).toContain('Sessions: 10');
    expect(pdf).toContain('Helvetica-Bold');
  });
});
