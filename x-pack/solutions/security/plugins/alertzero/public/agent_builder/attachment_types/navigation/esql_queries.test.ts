/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertLookupEsql,
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
    ).toBe(
      'FROM "logs-endpoint.events.process-default" METADATA _id | WHERE event.id == "abc\\"def" OR _id == "abc\\"def"'
    );
  });

  it('builds one multi-index events lookup and de-dupes ids and indices', () => {
    expect(
      buildEventsLookupEsql({
        events: [
          { event_id: 'evt-1', source_index: 'logs-a-default' },
          { event_id: 'evt-2', source_index: 'logs-b-default' },
          { event_id: 'evt-1', source_index: 'logs-a-default' },
        ],
      })
    ).toBe(
      'FROM "logs-a-default", "logs-b-default" METADATA _id | ' +
        'WHERE event.id IN ("evt-1", "evt-2") OR _id IN ("evt-1", "evt-2")'
    );
  });

  it('escapes quotes in event ids and indices', () => {
    expect(buildEventsLookupEsql({ events: [{ event_id: 'a"b', source_index: 'logs-"x"' }] })).toBe(
      'FROM "logs-\\"x\\"" METADATA _id | WHERE event.id IN ("a\\"b") OR _id IN ("a\\"b")'
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

  it('builds an alerts lookup from the indices on the refs', () => {
    expect(
      buildAlertsLookupEsql({
        alerts: [
          { alert_id: 'alert-1', index: '.alerts-security.alerts-soc' },
          { alert_id: 'alert-2', index: '.alerts-security.alerts-soc' },
        ],
      })
    ).toBe(
      'FROM ".alerts-security.alerts-soc" METADATA _id | ' +
        'WHERE kibana.alert.uuid IN ("alert-1", "alert-2") OR _id IN ("alert-1", "alert-2")'
    );
    expect(buildAlertsLookupEsql({ alerts: [] })).toBeUndefined();
  });

  it('builds alert lookup ES|QL against space alerts index', () => {
    expect(buildAlertLookupEsql({ spaceId: 'default', alertId: 'alert-1' })).toBe(
      'FROM ".alerts-security.alerts-default" METADATA _id | WHERE kibana.alert.uuid == "alert-1" OR _id == "alert-1"'
    );
  });

  it('builds threat report lookup ES|QL', () => {
    expect(buildThreatReportLookupEsql({ reportId: 'default:fp1' })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id == "default:fp1"'
    );
  });

  it('builds IN query for multiple report ids and de-dupes', () => {
    expect(buildThreatReportsInEsql({ reportIds: ['r1', 'r2', 'r1'] })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id IN ("r1", "r2")'
    );
  });

  it('returns undefined for an empty report ids array', () => {
    expect(buildThreatReportsInEsql({ reportIds: [] })).toBeUndefined();
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

  it('builds actor lookup ES|QL against threat report actors', () => {
    expect(buildActorLookupEsql({ value: 'APT-99' })).toBe(
      'FROM ".kibana-threat-reports*" | WHERE extracted.threat_actors == "APT-99"'
    );
    expect(buildActorLookupEsql({ value: '  ' })).toBeUndefined();
  });

  it('builds threat report ioc_set_hash lookup ES|QL', () => {
    expect(buildThreatReportIocSetHashLookupEsql({ value: 'set-hash-1' })).toBe(
      'FROM ".kibana-threat-reports*" | WHERE extracted.ioc_set_hash == "set-hash-1"'
    );
    expect(buildThreatReportIocSetHashLookupEsql({ value: '  ' })).toBeUndefined();
  });
});
