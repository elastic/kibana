/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertIdentityOf, triggeringAlertOf } from './alert_identity';

const v2 = { alert_version: 'v2', id: 'episode-1', group_hash: 'hash-1', status: 'active' };

describe('alertIdentityOf', () => {
  it.each([
    [
      'a significant event alert',
      { ...v2, rule_id: 'rule-1', source: 'elastic.significant_events', data: { event_id: 'e1' } },
      {
        alert_version: 'v2',
        alert_source: 'elastic.significant_events',
        source_kind: 'significant_events',
        fingerprint: 'e1',
      },
    ],
    [
      'an Elastic-configured rule alert',
      { ...v2, rule_id: 'rule-1', source: 'internal' },
      {
        alert_version: 'v2',
        alert_source: 'internal',
        source_kind: 'elastic_configured',
        fingerprint: 'a07aff3f5426300812746ca91bffbef23e006c90b94319a805dc8ea2fedb1715',
      },
    ],
    [
      'an external alert',
      { ...v2, source: 'datadog' },
      {
        alert_version: 'v2',
        alert_source: 'datadog',
        source_kind: 'external',
        fingerprint: 'bf0833d40cb55c606e33a3d73488a2ed500cb62bdf3c2e9959630d3d9e91ee1b',
      },
    ],
    [
      'a stored v2 snapshot without alert_version',
      { id: 'episode-1', source: 'datadog' },
      {
        alert_version: 'v2',
        alert_source: 'datadog',
        source_kind: 'external',
      },
    ],
    ['a v2 alert without a source', v2, { alert_version: 'v2' }],
    ['a classic alert', { id: 'alert-1', rule_id: 'rule-1' }, { alert_version: 'v1' }],
  ])(
    'identifies %s with a fingerprint that joins to alert ingress',
    (_label, snapshot, expected) => {
      expect(alertIdentityOf('default', snapshot)).toEqual(expected);
    }
  );
});

describe('triggeringAlertOf', () => {
  it('picks the subject among several alerts, and none when it is not one of them', () => {
    const alerts = [{ id: 'a' }, { id: 'b' }];

    expect(triggeringAlertOf('b', alerts)).toBe(alerts[1]);
    expect(triggeringAlertOf('c', alerts)).toBeUndefined();
  });
});
