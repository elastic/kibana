/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyHeader } from './section_headers';

describe('classifyHeader', () => {
  it.each([
    'Indicator of Compromise',
    'Indicators of Compromise',
    'Indicators   of  Compromise  (IOCs):',
    'IOCs (updated).',
    'Indicator',
    'IOC',
    'Observable',
    'Observations',
  ])('classifies %j as IOC content', (heading) => {
    expect(classifyHeader(heading)).toBe('ioc');
  });

  it.each([
    'References (2024):',
    'Source',
    'Bibliographies',
    'Further Reading',
    'Acknowledgement',
    'Comment',
    'Authors',
    'Related Articles',
    'Share this post',
    'About the author: Jane',
    'Discover more from us',
  ])('classifies %j as references', (heading) => {
    expect(classifyHeader(heading)).toBe('references');
  });

  it.each([
    '',
    'Executive Summary',
    'Threat Indicators Explained',
    'IOC (list) extra words',
    'About the malware',
    'About the authorization bypass',
    'Relatedfoo',
    'Sharepoint exploitation',
    'Similarity analysis',
  ])('classifies %j as prose', (heading) => {
    expect(classifyHeader(heading)).toBe('prose');
  });

  it.each([
    ['many parenthetical groups', '(a)'.repeat(20_000), 200],
    ['an unbalanced prefix', `${'('.repeat(128_000)})(ok)`, 500],
    ['unmatched whitespace', `${' '.repeat(32_000)}x`, 500],
  ])('stays bounded for %s', (_label, heading, maxMs) => {
    const started = process.hrtime.bigint();
    classifyHeader(heading);
    expect(Number(process.hrtime.bigint() - started) / 1e6).toBeLessThan(maxMs);
  });
});
