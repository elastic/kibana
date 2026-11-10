/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributeHits, isTier1SearchableIoc, type HitDocument } from './attribute_hits';

const baseDoc = (
  source: Record<string, unknown> = {},
  overrides: Partial<HitDocument> = {}
): HitDocument => ({
  index: 'logs-aws.cloudtrail-default',
  id: 'evt-1',
  timestamp: '2026-09-01T00:00:00.000Z',
  source,
  ...overrides,
});

describe('attributeHits', () => {
  it('returns matched.ioc when a searched IP appears on source.ip', () => {
    const [hit] = attributeHits(
      [baseDoc({ 'source.ip': '198.51.100.40' })],
      [{ type: 'ip', value: '198.51.100.40' }],
      []
    );
    expect(hit.matched).toEqual({
      ioc: { type: 'ip', value: '198.51.100.40' },
      field: 'source.ip',
      iocs: [{ type: 'ip', value: '198.51.100.40', field: 'source.ip' }],
    });
  });

  it('copies host, user and allowlisted fields onto the wire hit', () => {
    const [hit] = attributeHits(
      [
        baseDoc({
          'source.ip': '198.51.100.40',
          'host.name': 'WIN-1',
          'user.name': 'alice',
          'process.name': 'cmd.exe',
          'event.action': 'network_connection',
        }),
      ],
      [{ type: 'ip', value: '198.51.100.40' }],
      []
    );
    expect(hit).toEqual({
      id: 'evt-1',
      index: 'logs-aws.cloudtrail-default',
      timestamp: '2026-09-01T00:00:00.000Z',
      host: 'WIN-1',
      user: 'alice',
      fields: {
        'process.name': 'cmd.exe',
        'event.action': 'network_connection',
        'source.ip': '198.51.100.40',
      },
      matched: {
        ioc: { type: 'ip', value: '198.51.100.40' },
        field: 'source.ip',
        iocs: [{ type: 'ip', value: '198.51.100.40', field: 'source.ip' }],
      },
    });
  });

  it('attributes from matched_queries when present and keeps the primary match first', () => {
    const iocs = [
      { type: 'ip' as const, value: '198.51.100.40' },
      { type: 'domain' as const, value: 'evil.example' },
    ];
    const [hit] = attributeHits(
      [
        baseDoc(
          {
            'destination.ip': '198.51.100.40',
            'dns.question.name': 'evil.example',
          },
          {
            matched_queries: ['ioc_1|dns.question.name', 'ioc_0|destination.ip'],
          }
        ),
      ],
      iocs,
      []
    );
    expect(hit.matched).toEqual({
      ioc: { type: 'domain', value: 'evil.example' },
      field: 'dns.question.name',
      iocs: [
        { type: 'domain', value: 'evil.example', field: 'dns.question.name' },
        { type: 'ip', value: '198.51.100.40', field: 'destination.ip' },
      ],
    });
  });

  it('falls back to matchIoc over _source when matched_queries is absent', () => {
    const [hit] = attributeHits(
      [baseDoc({ 'destination.ip': '198.51.100.40', 'source.ip': '198.51.100.40' })],
      [{ type: 'ip', value: '198.51.100.40' }],
      []
    );
    expect(hit.matched?.iocs).toEqual([
      { type: 'ip', value: '198.51.100.40', field: 'source.ip' },
      { type: 'ip', value: '198.51.100.40', field: 'destination.ip' },
    ]);
    expect(hit.matched?.ioc).toEqual({ type: 'ip', value: '198.51.100.40' });
    expect(hit.matched?.field).toBe('source.ip');
  });

  it('returns every matching IOC from the fallback path, primary stays first', () => {
    const [hit] = attributeHits(
      [
        baseDoc({
          'source.ip': '10.0.0.1',
          'dns.question.name': 'evil.example',
        }),
      ],
      [
        { type: 'ip', value: '10.0.0.1' },
        { type: 'domain', value: 'evil.example' },
      ],
      []
    );
    expect(hit.matched?.iocs).toEqual([
      { type: 'ip', value: '10.0.0.1', field: 'source.ip' },
      { type: 'domain', value: 'evil.example', field: 'dns.question.name' },
    ]);
  });

  it('caps fields at 8 allowlisted keys, truncates values to 256, takes the first array value, and stringifies non-strings', () => {
    const long = 'x'.repeat(300);
    const source: Record<string, unknown> = {
      'source.ip': '10.0.0.1',
      'process.name': ['cmd.exe', 'ignored.exe'],
      'process.command_line': long,
      'process.parent.name': 42,
      'process.executable': true,
      'file.path': '/tmp/a',
      'file.hash.sha256': 'abc',
      'dns.question.name': 'q.example',
      'destination.ip': '1.2.3.4',
      'destination.domain': 'should-be-dropped-as-9th',
      'url.full': 'https://example',
      'event.action': 'exec',
    };
    const [hit] = attributeHits([baseDoc(source)], [{ type: 'ip', value: '10.0.0.1' }], []);
    expect(Object.keys(hit.fields ?? {})).toHaveLength(8);
    expect(hit.fields?.['process.name']).toBe('cmd.exe');
    expect(hit.fields?.['process.command_line']).toHaveLength(256);
    expect(hit.fields?.['process.parent.name']).toBe('42');
    expect(hit.fields?.['process.executable']).toBe('true');
    expect(hit.fields?.['destination.domain']).toBeUndefined();
  });

  // The shape a security alert's `_source` actually has: `kibana.alert.rule.threat`
  // is one dotted key holding the rule's threat array (see `build_alert.ts`).
  const alertThreat = (techniqueId: string, subtechniqueId?: string) => [
    {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://attack.mitre.org' },
      technique: [
        {
          id: techniqueId,
          name: 'Valid Accounts',
          reference: 'https://attack.mitre.org',
          ...(subtechniqueId
            ? { subtechnique: [{ id: subtechniqueId, name: 'Cloud Accounts', reference: '' }] }
            : {}),
        },
      ],
    },
  ];

  it('returns matched.technique_id when an alert carries a searched technique id', () => {
    const [hit] = attributeHits(
      [
        baseDoc(
          { 'kibana.alert.rule.threat': alertThreat('T1078') },
          { index: '.alerts-security.alerts-default' }
        ),
      ],
      [],
      ['T1078']
    );
    expect(hit.matched).toEqual({
      technique_id: 'T1078',
      field: 'kibana.alert.rule.threat.technique.id',
    });
  });

  it('returns matched.technique_id when the searched id is a sub-technique on the alert', () => {
    const [hit] = attributeHits(
      [
        baseDoc(
          { 'kibana.alert.rule.threat': alertThreat('T1078', 'T1078.004') },
          { index: '.alerts-security.alerts-default' }
        ),
      ],
      [],
      ['T1078.004']
    );
    expect(hit.matched).toEqual({
      technique_id: 'T1078.004',
      field: 'kibana.alert.rule.threat.technique.subtechnique.id',
    });
  });

  it('returns matched.technique_id for an already-flattened dotted id path', () => {
    const [hit] = attributeHits(
      [
        baseDoc(
          { 'kibana.alert.rule.threat.technique.id': ['t1078'] },
          { index: '.alerts-security.alerts-default' }
        ),
      ],
      [],
      ['T1078']
    );
    expect(hit.matched?.technique_id).toBe('T1078');
  });

  it('returns both ioc and technique_id when both match, preferring the IOC field', () => {
    const [hit] = attributeHits(
      [
        baseDoc(
          {
            'source.ip': '203.0.113.10',
            'kibana.alert.rule.threat': alertThreat('T1078', 'T1078.004'),
          },
          { index: '.alerts-security.alerts-default' }
        ),
      ],
      [{ type: 'ip', value: '203.0.113.10' }],
      ['T1078.004']
    );
    expect(hit.matched).toEqual({
      ioc: { type: 'ip', value: '203.0.113.10' },
      technique_id: 'T1078.004',
      field: 'source.ip',
      iocs: [{ type: 'ip', value: '203.0.113.10', field: 'source.ip' }],
    });
  });

  it('returns no matched when the document does not contain searched terms', () => {
    const [hit] = attributeHits(
      [baseDoc({ 'source.ip': '192.0.2.1' })],
      [{ type: 'ip', value: '198.51.100.40' }],
      ['T1078.004']
    );
    expect(hit.matched).toBeUndefined();
  });
});

describe('isTier1SearchableIoc', () => {
  it.each([32, 40, 64])('accepts a hash whose length names an algorithm (%i)', (length) => {
    expect(isTier1SearchableIoc({ type: 'hash', value: 'a'.repeat(length) })).toBe(true);
  });

  it('trims before measuring, as huntForThreat does, so a padded md5 still counts and a padded short hash does not', () => {
    expect(isTier1SearchableIoc({ type: 'hash', value: ` ${'a'.repeat(32)}` })).toBe(true);
    expect(isTier1SearchableIoc({ type: 'hash', value: `${'a'.repeat(6)}${' '.repeat(26)}` })).toBe(
      false
    );
  });

  it('rejects a hash of a length no algorithm produces, since buildIocShould emits no clause for it', () => {
    expect(isTier1SearchableIoc({ type: 'hash', value: 'abcdef' })).toBe(false);
  });

  it.each(['ip', 'domain', 'url', 'email'] as const)(
    'rejects a blank %s, which huntForThreat drops before building a clause',
    (type) => {
      expect(isTier1SearchableIoc({ type, value: '   ' })).toBe(false);
    }
  );

  it.each(['ip', 'domain', 'url', 'email'] as const)(
    'accepts a %s, which always has fields to search',
    (type) => {
      expect(isTier1SearchableIoc({ type, value: 'anything' })).toBe(true);
    }
  );
});

describe('attributeHits matched.iocs cap', () => {
  it('caps matched.iocs at 10 on the matched_queries path, primary first', () => {
    const iocs = Array.from({ length: 6 }, (_, i) => ({
      type: 'ip' as const,
      value: `198.51.100.${i}`,
    }));
    const matchedQueries = iocs.flatMap((_, i) => [
      `ioc_${i}|source.ip`,
      `ioc_${i}|destination.ip`,
    ]);
    const [hit] = attributeHits([baseDoc({}, { matched_queries: matchedQueries })], iocs, []);
    expect(hit.matched?.iocs).toHaveLength(10);
    expect(hit.matched?.iocs?.[0]).toEqual({
      type: 'ip',
      value: '198.51.100.0',
      field: 'source.ip',
    });
    expect(hit.matched?.ioc).toEqual({ type: 'ip', value: '198.51.100.0' });
  });

  it('caps matched.iocs at 10 on the _source fallback path', () => {
    const values = Array.from({ length: 12 }, (_, i) => `198.51.100.${i}`);
    const [hit] = attributeHits(
      [baseDoc({ 'source.ip': values })],
      values.map((value) => ({ type: 'ip' as const, value })),
      []
    );
    expect(hit.matched?.iocs).toHaveLength(10);
  });
});
