/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertDocsToRows } from './alert_docs_to_rows';

describe('alertDocsToRows', () => {
  it('reads scored fields from a nested ECS document', () => {
    const [row] = alertDocsToRows([
      {
        event: { category: ['process'], dataset: 'endpoint.events.process' },
        host: { name: 'host-1' },
        kibana: { alert: { severity: 'high', workflow_status: 'open' } },
      },
    ]);

    expect(row['event.category']).toBe('process');
    expect(row['event.dataset']).toBe('endpoint.events.process');
    expect(row['host.name']).toBe('host-1');
    expect(row['kibana.alert.severity']).toBe('high');
    expect(row['kibana.alert.workflow_status']).toBe('open');
  });

  it('reads scored fields from a flattened (dotted-key) document', () => {
    const [row] = alertDocsToRows([
      {
        'event.category': ['process', 'network'],
        'threat.tactic.id': 'TA0002',
        'threat.technique.id': ['T1059', 'T1071'],
        'process.code_signature.trusted': true,
      },
    ]);

    expect(row['event.category']).toBe('process,network');
    expect(row['threat.tactic.id']).toBe('TA0002');
    expect(row['threat.technique.id']).toBe('T1059,T1071');
    expect(row['process.code_signature.trusted']).toBe('true');
  });

  it('omits fields that are absent rather than emitting empty strings', () => {
    const [row] = alertDocsToRows([{ host: { name: 'host-1' } }]);

    expect(row).toEqual({ 'host.name': 'host-1' });
    expect('event.category' in row).toBe(false);
  });

  it('produces one row per document', () => {
    const rows = alertDocsToRows([{ host: { name: 'a' } }, { host: { name: 'b' } }]);
    expect(rows).toHaveLength(2);
  });

  it('does not treat a nested object leaf as a value', () => {
    const [row] = alertDocsToRows([{ host: { name: { first: 'a' } } }]);
    expect('host.name' in row).toBe(false);
  });

  it('unwraps an elasticsearch.search hit (fields under _source)', () => {
    const [row] = alertDocsToRows([
      {
        _id: 'a1',
        _index: '.alerts-security.alerts-default',
        _source: { event: { category: ['process'] }, host: { name: 'host-1' } },
      },
    ]);

    expect(row['event.category']).toBe('process');
    expect(row['host.name']).toBe('host-1');
  });

  describe('MITRE tactic / technique ids', () => {
    it('reads ids from a nested threat object', () => {
      const [row] = alertDocsToRows([
        {
          threat: {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0006', name: 'Credential Access' },
            technique: [{ id: 'T1056', name: 'Input Capture' }],
          },
        },
      ]);

      expect(row['threat.tactic.id']).toBe('TA0006');
      expect(row['threat.technique.id']).toBe('T1056');
    });

    it('recovers ids from reference URLs when the id fields are absent', () => {
      const [row] = alertDocsToRows([
        {
          threat: {
            framework: 'MITRE ATT&CK',
            tactic: { reference: 'https://attack.mitre.org/tactics/TA0006/' },
            technique: {
              reference: 'https://attack.mitre.org/techniques/T1056/',
              subtechnique: { reference: 'https://attack.mitre.org/techniques/T1056/002/' },
            },
          },
        },
      ]);

      expect(row['threat.tactic.id']).toBe('TA0006');
      // The sub-technique reference resolves to the technique-level id (deduped).
      expect(row['threat.technique.id']).toBe('T1056');
    });

    it('recovers ids from flattened reference dotted keys', () => {
      const [row] = alertDocsToRows([
        {
          'threat.framework': 'MITRE ATT&CK',
          'threat.tactic.reference': 'https://attack.mitre.org/tactics/TA0006/',
          'threat.technique.reference': 'https://attack.mitre.org/techniques/T1056/',
          'threat.technique.subtechnique.reference':
            'https://attack.mitre.org/techniques/T1056/002/',
        },
      ]);

      expect(row['threat.tactic.id']).toBe('TA0006');
      expect(row['threat.technique.id']).toBe('T1056');
    });

    it('handles threat as an array of threat objects, deduping ids', () => {
      const [row] = alertDocsToRows([
        {
          threat: [
            {
              tactic: { id: 'TA0002' },
              technique: [{ id: 'T1059' }, { id: 'T1059' }],
            },
            {
              tactic: { reference: 'https://attack.mitre.org/tactics/TA0011/' },
              technique: [{ reference: 'https://attack.mitre.org/techniques/T1071/' }],
            },
          ],
        },
      ]);

      expect(row['threat.tactic.id']).toBe('TA0002,TA0011');
      expect(row['threat.technique.id']).toBe('T1059,T1071');
    });

    it('does not cross-contaminate tactic and technique patterns', () => {
      const [row] = alertDocsToRows([
        { threat: { tactic: { id: 'TA0006' }, technique: [{ id: 'T1056' }] } },
      ]);

      // A tactic id (TA####) must never leak into the technique field, nor vice-versa.
      expect(row['threat.tactic.id']).toBe('TA0006');
      expect(row['threat.technique.id']).toBe('T1056');
    });

    it('omits MITRE fields entirely when the alert carries no threat data', () => {
      const [row] = alertDocsToRows([{ host: { name: 'host-1' } }]);
      expect('threat.tactic.id' in row).toBe(false);
      expect('threat.technique.id' in row).toBe(false);
    });
  });

  describe('entity identity, risk, and criticality', () => {
    it('extracts strong identifiers and cloud principals', () => {
      const [row] = alertDocsToRows([
        {
          host: { id: 'H-1' },
          user: { id: 'U-1' },
          aws: { cloudtrail: { user_identity: { arn: 'arn:aws:iam::1:user/x' } } },
        },
      ]);

      expect(row['host.id']).toBe('H-1');
      expect(row['user.id']).toBe('U-1');
      expect(row['aws.cloudtrail.user_identity.arn']).toBe('arn:aws:iam::1:user/x');
    });

    it('extracts entity risk scores and asset criticality', () => {
      const [row] = alertDocsToRows([
        {
          host: {
            risk: { calculated_score_norm: 92 },
            asset: { criticality: 'high_impact' },
          },
          user: { risk: { calculated_score_norm: 40 } },
        },
      ]);

      expect(row['host.risk.calculated_score_norm']).toBe('92');
      expect(row['user.risk.calculated_score_norm']).toBe('40');
      expect(row['host.asset.criticality']).toBe('high_impact');
    });
  });
});
