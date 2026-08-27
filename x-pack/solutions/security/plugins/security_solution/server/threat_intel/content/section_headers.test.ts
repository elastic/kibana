/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyHeader, normalizeHeader } from './section_headers';

describe('normalizeHeader', () => {
  it.each([
    ['Indicators Of Compromise', 'indicators of compromise'],
    ['Indicators of Compromise (IOCs)', 'indicators of compromise'],
    ['Indicators   of  Compromise  (IOCs)', 'indicators of compromise'],
    ['Indicators of Compromise (IOCs):', 'indicators of compromise'],
    ['IOCs (updated).', 'iocs'],
    ['References (2024):', 'references'],
    ['a (b) (c)', 'a'],
    ['iocs', 'iocs'],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeHeader(input)).toBe(expected);
  });

  it.each([
    ['many parenthetical groups', '(a)'.repeat(20_000), 200],
    ['an unbalanced prefix', `${'('.repeat(128_000)})(ok)`, 500],
    ['unmatched whitespace', `${' '.repeat(32_000)}x`, 500],
  ])('stays bounded for %s', (_label, input, maxMs) => {
    const started = process.hrtime.bigint();
    normalizeHeader(input);
    expect(Number(process.hrtime.bigint() - started) / 1e6).toBeLessThan(maxMs);
  });
});

describe('classifyHeader', () => {
  it.each([
    'Indicator of Compromise',
    'Indicators of Compromise',
    'Indicator of Compromise (IOC)',
    'Indicator',
    'Indicators',
    'IOC',
    'IOCs',
    'Observable',
    'Observables',
    'Observation',
    'Observations',
    'iocs.',
  ])('classifies %j as IOC content', (heading) => {
    expect(classifyHeader(heading)).toBe('ioc');
  });

  it.each([
    'Reference',
    'References',
    'Source',
    'Sources:',
    'Bibliography',
    'Bibliographies',
    'Further Reading',
    'Acknowledgement',
    'Acknowledgements',
    'Comment',
    'Comments',
    'Author',
    'Authors',
    'Related Articles',
    'Similar Reports',
    'Share this post',
    'About the Author',
    'About the author, Jane Doe',
    'About the author: Jane',
    'Discover more from us',
  ])('classifies %j as references', (heading) => {
    expect(classifyHeader(heading)).toBe('references');
  });

  it.each([
    '',
    'Executive Summary',
    'Attribution',
    'Timeline',
    'Recommendations',
    'Threat Indicators Explained',
    'IOC (list) extra words',
    'Indication',
    'Glossary',
    'Glossaries',
    'Analysis',
    'Overview',
    'Summary',
    'About the malware',
    'About the campaign',
    'About the vulnerability',
    'About the threat actor',
    'About the authorization bypass',
    'About the authoritative DNS server',
    'About the authenticator',
    'Relatedfoo',
    'Sharepoint exploitation',
    'Similarity analysis',
  ])('classifies %j as prose', (heading) => {
    expect(classifyHeader(heading)).toBe('prose');
  });
});
