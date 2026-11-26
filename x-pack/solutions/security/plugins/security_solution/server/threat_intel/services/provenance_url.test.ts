/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_URL_LENGTH } from '../../../common/threat_intel';
import { normalizeProvenanceUrl } from './provenance_url';

describe('normalizeProvenanceUrl', () => {
  it.each(['file:///etc/passwd', 'data:text/plain,secret', 'ftp://example.com/file'])(
    'rejects unsupported scheme %s',
    (value) => {
      expect(normalizeProvenanceUrl(value)).toBeUndefined();
    }
  );

  it('removes username and password from an HTTPS URL', () => {
    expect(normalizeProvenanceUrl('https://user:secret@example.com/report?id=1')).toBe(
      'https://example.com/report?id=1'
    );
  });

  it('accepts HTTP and HTTPS provenance', () => {
    expect(normalizeProvenanceUrl('http://example.com/report')).toBe('http://example.com/report');
    expect(normalizeProvenanceUrl('https://example.com/report')).toBe('https://example.com/report');
  });

  it('rejects malformed and empty values', () => {
    expect(normalizeProvenanceUrl('not a url')).toBeUndefined();
    expect(normalizeProvenanceUrl('')).toBeUndefined();
    expect(normalizeProvenanceUrl(undefined)).toBeUndefined();
  });

  it('rejects input over the bound before parsing', () => {
    expect(
      normalizeProvenanceUrl(`https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`)
    ).toBeUndefined();
  });

  it('rejects a URL whose serialized form crosses the bound', () => {
    const prefix = 'https://example.com/';
    const input = `${prefix}${'é'.repeat(MAX_URL_LENGTH - prefix.length)}`;
    expect(input).toHaveLength(MAX_URL_LENGTH);
    expect(normalizeProvenanceUrl(input)).toBeUndefined();
  });
});
