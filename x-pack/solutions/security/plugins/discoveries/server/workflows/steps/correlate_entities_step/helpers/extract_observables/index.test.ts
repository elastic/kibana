/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractObservables, getFieldStringValues } from '.';

describe('getFieldStringValues', () => {
  it('resolves nested object paths', () => {
    expect(getFieldStringValues({ source: { ip: '10.0.0.1' } }, 'source.ip')).toEqual(['10.0.0.1']);
  });

  it('resolves flattened dotted keys', () => {
    expect(getFieldStringValues({ 'source.ip': '10.0.0.1' }, 'source.ip')).toEqual(['10.0.0.1']);
  });

  it('flattens array values', () => {
    expect(getFieldStringValues({ source: { ip: ['10.0.0.1', '10.0.0.2'] } }, 'source.ip')).toEqual(
      ['10.0.0.1', '10.0.0.2']
    );
  });

  it('resolves arrays of intermediate objects', () => {
    expect(
      getFieldStringValues(
        { process: [{ hash: { sha256: 'abc' } }, { hash: { sha256: 'def' } }] },
        'process.hash.sha256'
      )
    ).toEqual(['abc', 'def']);
  });

  it('ignores non-string and empty values', () => {
    expect(getFieldStringValues({ source: { ip: 42 } }, 'source.ip')).toEqual([]);
    expect(getFieldStringValues({ source: { ip: '' } }, 'source.ip')).toEqual([]);
  });

  it('returns an empty array when the path is missing', () => {
    expect(getFieldStringValues({}, 'source.ip')).toEqual([]);
  });
});

describe('extractObservables', () => {
  it('classifies source.ip and destination.ip as ipv4 observables', () => {
    const observables = extractObservables({
      sources: [{ source: { ip: '10.0.0.1' }, destination: { ip: '10.0.0.2' } }],
    });

    expect(observables).toEqual([
      { type_key: 'observable-type-ipv4', value: '10.0.0.1' },
      { type_key: 'observable-type-ipv4', value: '10.0.0.2' },
    ]);
  });

  it('classifies IPs containing a colon as ipv6', () => {
    const observables = extractObservables({
      sources: [{ source: { ip: '2001:db8::1' } }],
    });

    expect(observables).toEqual([{ type_key: 'observable-type-ipv6', value: '2001:db8::1' }]);
  });

  it('extracts host names as hostname observables', () => {
    const observables = extractObservables({ sources: [{ host: { name: 'web-01' } }] });

    expect(observables).toEqual([{ type_key: 'observable-type-hostname', value: 'web-01' }]);
  });

  it('skips host names present in excludeValues (matched Entity Store entities)', () => {
    const observables = extractObservables({
      excludeValues: new Set(['web-01']),
      sources: [{ host: { name: 'web-01' } }],
    });

    expect(observables).toEqual([]);
  });

  it.each([
    ['dll', 'md5'],
    ['file', 'sha256'],
    ['process', 'sha1'],
  ])('extracts %s.hash.%s as a file-hash observable', (parent, hashField) => {
    const observables = extractObservables({
      sources: [{ [parent]: { hash: { [hashField]: 'deadbeef' } } }],
    });

    expect(observables).toEqual([{ type_key: 'observable-type-file-hash', value: 'deadbeef' }]);
  });

  it('extracts file paths, domains, and agent ids', () => {
    const observables = extractObservables({
      sources: [
        {
          agent: { id: 'agent-1' },
          dns: { question: { name: 'evil.example.com' } },
          file: { path: '/tmp/x' },
        },
      ],
    });

    expect(observables).toEqual(
      expect.arrayContaining([
        { type_key: 'observable-type-file-path', value: '/tmp/x' },
        { type_key: 'observable-type-domain', value: 'evil.example.com' },
        { type_key: 'observable-type-agent-id', value: 'agent-1' },
      ])
    );
    expect(observables).toHaveLength(3);
  });

  it('deduplicates observables by type_key + value across sources', () => {
    const observables = extractObservables({
      sources: [{ source: { ip: '10.0.0.1' } }, { source: { ip: '10.0.0.1' } }],
    });

    expect(observables).toHaveLength(1);
  });

  it('returns an empty array for empty sources', () => {
    expect(extractObservables({ sources: [] })).toEqual([]);
  });
});
