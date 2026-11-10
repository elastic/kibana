/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertsLookupEsql,
  buildEntityLookupEsql,
  buildEventLookupEsql,
  buildEventsLookupEsql,
  getAlertsIndex,
  buildIocMatchEsql,
} from './esql_queries';

describe('esql_queries', () => {
  it('builds space-scoped alerts index', () => {
    expect(getAlertsIndex('default')).toBe('.alerts-security.alerts-default');
    expect(getAlertsIndex('soc')).toBe('.alerts-security.alerts-soc');
  });

  it('builds event lookup ES|QL with quoted index and escaped event id', () => {
    expect(
      buildEventLookupEsql({
        index: 'logs-endpoint.events.process-default',
        eventId: 'abc"def',
      })
    ).toBe('FROM "logs-endpoint.events.process-default" METADATA _id | WHERE _id == "abc\\"def"');
  });

  it('builds one multi-index events lookup, groups ids per index, and de-dupes', () => {
    expect(
      buildEventsLookupEsql({
        events: [
          { event_id: 'evt-1', source_index: 'logs-a-default' },
          { event_id: 'evt-2', source_index: 'logs-b-default' },
          { event_id: 'evt-1', source_index: 'logs-a-default' },
        ],
      })
    ).toBe(
      'FROM "logs-a-default", "logs-b-default" METADATA _id, _index | ' +
        'WHERE (_index == "logs-a-default" AND (_id IN ("evt-1"))) OR ' +
        '(_index == "logs-b-default" AND (_id IN ("evt-2")))'
    );
  });

  it('scopes each id to its own source index so a shared id cannot cross-match', () => {
    // Same id in two different indices must not surface the other index's document.
    expect(
      buildEventsLookupEsql({
        events: [
          { event_id: 'shared-id', source_index: 'logs-a-default' },
          { event_id: 'shared-id', source_index: 'logs-b-default' },
        ],
      })
    ).toBe(
      'FROM "logs-a-default", "logs-b-default" METADATA _id, _index | ' +
        'WHERE (_index == "logs-a-default" AND (_id IN ("shared-id"))) OR ' +
        '(_index == "logs-b-default" AND (_id IN ("shared-id")))'
    );
  });

  it('escapes quotes in event ids and indices', () => {
    expect(buildEventsLookupEsql({ events: [{ event_id: 'a"b', source_index: 'logs-"x"' }] })).toBe(
      'FROM "logs-\\"x\\"" METADATA _id, _index | ' +
        'WHERE (_index == "logs-\\"x\\"" AND (_id IN ("a\\"b")))'
    );
  });

  it('returns undefined when events are empty or blank', () => {
    expect(buildEventsLookupEsql({ events: [] })).toBeUndefined();
    expect(
      buildEventsLookupEsql({ events: [{ event_id: '  ', source_index: 'logs-a' }] })
    ).toBeUndefined();
    expect(
      buildEventsLookupEsql({ events: [{ event_id: 'evt-1', source_index: '  ' }] })
    ).toBeUndefined();
  });

  it('pins every alert ref to the current space alias, ignoring the persisted index', () => {
    expect(
      buildAlertsLookupEsql({
        alerts: [
          // A ref naming another space's alias must not be queried.
          { alert_id: 'alert-1', index: '.alerts-security.alerts-other' },
          { alert_id: 'alert-2', index: '*' },
        ],
        spaceId: 'soc',
      })
    ).toBe(
      'FROM ".alerts-security.alerts-soc" METADATA _id, _index | ' +
        'WHERE (_index == ".alerts-security.alerts-soc" AND ' +
        '(kibana.alert.uuid IN ("alert-1", "alert-2") OR _id IN ("alert-1", "alert-2")))'
    );
    expect(buildAlertsLookupEsql({ alerts: [], spaceId: 'soc' })).toBeUndefined();
  });

  it('folds case for hash and domain IOC pivots, matching Tier 1, and not for others', () => {
    expect(
      buildIocMatchEsql({
        indices: ['logs-endpoint.events.process-default'],
        field: 'process.hash.sha256',
        value: 'ABCDEF0123',
        iocType: 'hash',
      })
    ).toBe(
      'FROM "logs-endpoint.events.process-default" | WHERE MV_CONTAINS(TO_LOWER(process.hash.sha256), "abcdef0123")'
    );
    expect(
      buildIocMatchEsql({
        indices: ['logs-dns-default'],
        field: 'dns.question.name',
        value: 'Evil.Example',
        iocType: 'domain',
      })
    ).toBe(
      'FROM "logs-dns-default" | WHERE MV_CONTAINS(TO_LOWER(dns.question.name), "evil.example")'
    );
    expect(
      buildIocMatchEsql({
        indices: ['logs-*'],
        field: 'url.full',
        value: 'https://Evil.Example/A',
        iocType: 'url',
      })
    ).toBe('FROM "logs-*" | WHERE MV_CONTAINS(TO_STRING(url.full), "https://Evil.Example/A")');
    expect(buildIocMatchEsql({ indices: [], field: 'url.full', value: 'x' })).toBeUndefined();
  });

  it('pivots IOC matches with a multivalue-aware predicate, comparing ip IOCs as ip', () => {
    // Tier 1 term queries hit any element of `host.ip` / `related.ip`; scalar `==` would
    // be null on that cell and open Discover with no rows for a confirmed match.
    expect(
      buildIocMatchEsql({
        indices: ['logs-*'],
        field: 'related.ip',
        value: '203.0.113.77',
        iocType: 'ip',
      })
    ).toBe('FROM "logs-*" | WHERE MV_CONTAINS(TO_IP(related.ip), "203.0.113.77"::ip)');
    // An untyped value that parses as an address still compares as ip: `MV_CONTAINS` needs
    // matching types, and an `ip` column against a keyword literal fails verification.
    expect(
      buildIocMatchEsql({ indices: ['logs-*'], field: 'source.ip', value: '2001:DB8::1' })
    ).toBe('FROM "logs-*" | WHERE MV_CONTAINS(TO_IP(source.ip), "2001:DB8::1"::ip)');
  });

  it('never casts an unparseable ip value, since a null literal would match every row', () => {
    expect(
      buildIocMatchEsql({
        indices: ['logs-*'],
        field: 'source.ip',
        value: 'not-an-ip',
        iocType: 'ip',
      })
    ).toBe('FROM "logs-*" | WHERE MV_CONTAINS(TO_STRING(source.ip), "not-an-ip")');
  });

  it('builds entity lookup ES|QL on the exact ECS field', () => {
    expect(buildEntityLookupEsql({ field: 'host.name', value: 'web-01' })).toBe(
      'FROM "logs-*" | WHERE host.name == "web-01"'
    );
    expect(
      buildEntityLookupEsql({ field: 'user.name', value: 'a"b', indexPattern: 'logs-aws.*' })
    ).toBe('FROM "logs-aws.*" | WHERE user.name == "a\\"b"');
    expect(buildEntityLookupEsql({ field: 'host.name', value: '  ' })).toBeUndefined();
    expect(buildEntityLookupEsql({ field: '  ', value: 'web-01' })).toBeUndefined();
  });
});
