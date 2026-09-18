/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertLookupEsql,
  buildEventLookupEsql,
  buildIocLookupEsql,
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

  it('returns undefined IOC query for unknown types', () => {
    expect(buildIocLookupEsql({ type: 'unknown', value: 'x' })).toBeUndefined();
  });

  it('builds IPV4 IOC query', () => {
    expect(buildIocLookupEsql({ type: 'ipv4-addr', value: '1.2.3.4' })).toBe(
      'FROM "logs-*" | WHERE source.ip == "1.2.3.4" OR destination.ip == "1.2.3.4" OR client.ip == "1.2.3.4" OR server.ip == "1.2.3.4"'
    );
  });

  it('builds email IOC query against user.email fields present in logs', () => {
    expect(buildIocLookupEsql({ type: 'email-addr', value: 'dev-user@corp.example' })).toBe(
      'FROM "logs-*" | WHERE user.email == "dev-user@corp.example" OR user.target.email == "dev-user@corp.example"'
    );
  });
});
