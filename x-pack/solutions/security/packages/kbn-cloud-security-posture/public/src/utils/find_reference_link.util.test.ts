/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findReferenceLink } from './find_reference_link.util';

describe('findReferenceLink', () => {
  it('should find reference with ID in any search param', () => {
    const references = [
      'https://nvd.nist.gov/vuln/detail?name=CVE-2023-12345',
      'https://nvd.nist.gov/vuln/detail?id=CVE-2023-54321',
    ];
    expect(findReferenceLink(references, 'CVE-2023-12345')).toBe(references[0]);
    expect(findReferenceLink(references, 'CVE-2023-54321')).toBe(references[1]);
  });

  it('should find reference from multiple links', () => {
    const references = [
      'http://www.nessus.org/u?5b3cb0db',
      'https://www.cve.org/CVERecord?id=CVE-2022-2068',
      'https://www.openssl.org/news/secadv/20220621.txt',
    ];
    expect(findReferenceLink(references, 'CVE-2022-2068')).toBe(references[1]);
  });

  it('should find reference with ID in pathname', () => {
    const references = ['https://security.example.com/CVE-2023-12345'];
    expect(findReferenceLink(references, 'CVE-2023-12345')).toBe(references[0]);
  });

  it('should handle case-insensitive matching', () => {
    const references = ['https://security.example.com/cve-2023-12345'];
    expect(findReferenceLink(references, 'CVE-2023-12345')).toBe(references[0]);
  });

  it('should return null when no matching reference is found', () => {
    const references = [
      'https://security.example.com/CVE-2023-56789',
      'https://nvd.nist.gov/vuln/detail?name=CVE-2023-56789',
    ];
    expect(findReferenceLink(references, 'CVE-2023-12345')).toBeNull();
  });

  it('should handle invalid URLs gracefully', () => {
    const references = ['not-a-valid-url'];
    expect(findReferenceLink(references, 'CVE-2023-12345')).toBeNull();
  });

  it('should handle empty references array', () => {
    expect(findReferenceLink([], 'CVE-2023-12345')).toBeNull();
  });
});
