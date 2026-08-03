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
});
