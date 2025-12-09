/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertQradarReferenceSetToLookup } from './qradar_reference_set';

describe('convertQradarReferenceSetToLookup', () => {
  const fallbackName = 'fallback-set';

  it('converts a reference set export with explicit name and values into CSV lookup content', () => {
    const fileContent = JSON.stringify({
      name: 'Blocked IPs',
      data: [
        { value: '1.1.1.1', last_seen: '2024-01-01T00:00:00Z' },
        { value: 'malicious.example.com' },
      ],
    });

    const lookup = convertQradarReferenceSetToLookup({ fileContent, fallbackName });

    expect(lookup.name).toBe('Blocked IPs');
    expect(lookup.type).toBe('lookup');
    expect(lookup.content).toBe('value\r\n1.1.1.1\r\nmalicious.example.com');
  });

  it('escapes commas, quotes, and newlines in values', () => {
    const fileContent = JSON.stringify({
      name: 'Suspicious Hosts',
      data: [{ value: 'host,"with,commas"' }, { value: 'line\nbreak' }],
    });

    const lookup = convertQradarReferenceSetToLookup({ fileContent, fallbackName });

    expect(lookup.content).toBe('value\r\n"host,""with,commas"""\r\n"line\nbreak"');
  });

  it('falls back to provided name when export has no name', () => {
    const fileContent = JSON.stringify({
      data: [{ value: '10.0.0.1' }],
    });

    const lookup = convertQradarReferenceSetToLookup({ fileContent, fallbackName });

    expect(lookup.name).toBe(fallbackName);
  });

  it('returns empty content when no values exist', () => {
    const fileContent = JSON.stringify({
      name: 'Empty Set',
      data: [],
    });

    const lookup = convertQradarReferenceSetToLookup({ fileContent, fallbackName });
    expect(lookup.content).toBe('');
  });

  it('throws when JSON is invalid', () => {
    expect(() =>
      convertQradarReferenceSetToLookup({ fileContent: 'not json', fallbackName })
    ).toThrow('QRadar reference set export must be valid JSON.');
  });

  it('throws when name is missing and fallback is empty', () => {
    const fileContent = JSON.stringify({
      data: [{ value: 'foo' }],
    });

    expect(() => convertQradarReferenceSetToLookup({ fileContent, fallbackName: '' })).toThrow(
      'Reference set name is missing.'
    );
  });
});
