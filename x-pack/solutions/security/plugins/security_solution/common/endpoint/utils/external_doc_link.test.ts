/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExternalDocLink } from './external_doc_link';

describe('toExternalDocLink', () => {
  it('keeps HTTPS Elastic docs URLs regardless of path', () => {
    const links = [
      'https://www.elastic.co/docs/solutions/security',
      'https://www.elastic.co/guide/en/security/current/index.html',
      'https://www.elastic.co/pricing',
      'https://www.elastic.co/',
      'https://www.elastic.co',
      'https://elastic.co/docs',
      'https://support.elastic.co/some/future/kb/article',
    ];

    for (const link of links) {
      expect(toExternalDocLink(link)).toBe(link);
    }
  });

  it('trims surrounding whitespace before validating', () => {
    expect(toExternalDocLink('  https://www.elastic.co/docs  ')).toBe(
      'https://www.elastic.co/docs'
    );
  });

  it('rejects in-app / relative paths', () => {
    expect(toExternalDocLink('/app/security/administration/UNKNOWN')).toBe('');
    expect(toExternalDocLink('/administration/policy')).toBe('');
    expect(toExternalDocLink('app/security')).toBe('');
  });

  it('rejects the fabricated UNKNOWN placeholder', () => {
    expect(toExternalDocLink('UNKNOWN')).toBe('');
  });

  it('rejects non-https protocols', () => {
    expect(toExternalDocLink('http://www.elastic.co/docs')).toBe('');
    expect(toExternalDocLink('ftp://www.elastic.co/docs')).toBe('');
  });

  it('rejects non-Elastic hosts, including look-alikes', () => {
    expect(toExternalDocLink('https://www.evil.com/docs')).toBe('');
    expect(toExternalDocLink('https://elastic.co.evil.com/docs')).toBe('');
    expect(toExternalDocLink('https://notelastic.co/docs')).toBe('');
  });

  it('rejects empty, whitespace, and non-string values', () => {
    expect(toExternalDocLink('')).toBe('');
    expect(toExternalDocLink('   ')).toBe('');
    expect(toExternalDocLink(undefined)).toBe('');
    expect(toExternalDocLink(null)).toBe('');
    expect(toExternalDocLink(42)).toBe('');
    expect(toExternalDocLink({ link: 'https://www.elastic.co' })).toBe('');
  });

  it('rejects over-length values', () => {
    const longPath = 'a'.repeat(2100);
    expect(toExternalDocLink(`https://www.elastic.co/docs/${longPath}`)).toBe('');
  });
});
