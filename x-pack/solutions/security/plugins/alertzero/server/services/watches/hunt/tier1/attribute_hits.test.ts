/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attributeHits } from './attribute_hits';
import type { HuntForThreatHit } from '@kbn/alertzero-common';

const baseHit = (overrides: Record<string, unknown> = {}): HuntForThreatHit =>
  ({
    index: 'logs-aws.cloudtrail-default',
    id: 'evt-1',
    score: 1,
    ...overrides,
  } as HuntForThreatHit);

describe('attributeHits', () => {
  it('returns matched.ioc when a searched IP appears on source.ip', () => {
    const [hit] = attributeHits(
      [baseHit({ 'source.ip': '198.51.100.40' })],
      [{ type: 'ip', value: '198.51.100.40' }],
      []
    );
    expect(hit.matched).toEqual({
      ioc: { type: 'ip', value: '198.51.100.40' },
      field: 'source.ip',
    });
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
        baseHit({
          index: '.alerts-security.alerts-default',
          'kibana.alert.rule.threat': alertThreat('T1078'),
        }),
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
        baseHit({
          index: '.alerts-security.alerts-default',
          'kibana.alert.rule.threat': alertThreat('T1078', 'T1078.004'),
        }),
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
        baseHit({
          index: '.alerts-security.alerts-default',
          'kibana.alert.rule.threat.technique.id': ['t1078'],
        }),
      ],
      [],
      ['T1078']
    );
    expect(hit.matched?.technique_id).toBe('T1078');
  });

  it('returns both ioc and technique_id when both match, preferring the IOC field', () => {
    const [hit] = attributeHits(
      [
        baseHit({
          index: '.alerts-security.alerts-default',
          'source.ip': '203.0.113.10',
          'kibana.alert.rule.threat': alertThreat('T1078', 'T1078.004'),
        }),
      ],
      [{ type: 'ip', value: '203.0.113.10' }],
      ['T1078.004']
    );
    expect(hit.matched).toEqual({
      ioc: { type: 'ip', value: '203.0.113.10' },
      technique_id: 'T1078.004',
      field: 'source.ip',
    });
  });

  it('returns no matched when the document does not contain searched terms', () => {
    const [hit] = attributeHits(
      [baseHit({ 'source.ip': '192.0.2.1' })],
      [{ type: 'ip', value: '198.51.100.40' }],
      ['T1078.004']
    );
    expect(hit.matched).toBeUndefined();
  });
});
