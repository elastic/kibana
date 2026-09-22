/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertsLookupEsql,
  buildActorLookupEsql,
  buildEntityLookupEsql,
  buildEventLookupEsql,
  buildEventsLookupEsql,
  buildThreatReportIocSetHashLookupEsql,
  buildThreatReportLookupEsql,
  buildThreatReportsInEsql,
  getAlertsIndex,
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

  it('builds threat report lookup ES|QL scoped to the current space and global sentinel', () => {
    expect(buildThreatReportLookupEsql({ reportId: 'default:fp1', spaceId: 'soc' })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id IN ("default:fp1") AND ' +
        'space_id IN ("soc", "*")'
    );
  });

  it('builds IN query for multiple report ids and de-dupes, scoped to the current space', () => {
    expect(buildThreatReportsInEsql({ reportIds: ['r1', 'r2', 'r1'], spaceId: 'soc' })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id IN ("r1", "r2") AND ' +
        'space_id IN ("soc", "*")'
    );
  });

  it('returns undefined for an empty report ids array', () => {
    expect(buildThreatReportsInEsql({ reportIds: [], spaceId: 'soc' })).toBeUndefined();
  });

  it('builds entity lookup ES|QL on the exact ECS field', () => {
    expect(buildEntityLookupEsql({ field: 'user.name', value: 'dev-user' })).toBe(
      'FROM "logs-*" | WHERE user.name == "dev-user"'
    );
    expect(buildEntityLookupEsql({ field: 'host.name', value: 'ci-deploy-runner-07' })).toBe(
      'FROM "logs-*" | WHERE host.name == "ci-deploy-runner-07"'
    );
    expect(buildEntityLookupEsql({ field: 'user.name', value: '  ' })).toBeUndefined();
  });

  it.each([
    ['actor', buildActorLookupEsql, 'extracted.threat_actors', 'APT-99'] as const,
    [
      'ioc_set_hash',
      buildThreatReportIocSetHashLookupEsql,
      'extracted.ioc_set_hash',
      'set-hash-1',
    ] as const,
  ])('builds threat report %s lookup ES|QL', (_kind, build, field, value) => {
    expect(build({ value, spaceId: 'soc' })).toBe(
      `FROM ".kibana-threat-reports*" | WHERE ${field} == "${value}" AND ` +
        'space_id IN ("soc", "*")'
    );
    expect(build({ value: '  ', spaceId: 'soc' })).toBeUndefined();
  });
});
