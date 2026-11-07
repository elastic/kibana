/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceHuntArtifact } from './hunt_artifacts';
import { buildHuntPresentation, humanizeEvidence } from './hunt_result_presentation';

const evidenceArtifact = (rows: Array<Record<string, unknown>>): EvidenceHuntArtifact => ({
  id: 'evidence-1',
  type: 'evidence',
  toolId: 'platform.core.execute_esql',
  query: 'FROM logs-*',
  rowCount: rows.length,
  columns: [...new Set(rows.flatMap((row) => Object.keys(row)))],
  rows,
});

describe('hunt result presentation', () => {
  it('produces a deterministic process-path finding title', () => {
    const presentation = buildHuntPresentation({
      prompt: 'Hunt for lateral movement',
      artifacts: [
        evidenceArtifact([
          {
            'source.ip': '10.0.1.45',
            'process.name': 'psexec.exe',
            'destination.ip': '10.0.0.1',
            event_count: 34,
            'kibana.alert.severity': 'high',
          },
        ]),
      ],
    });

    expect(presentation.findings[0]).toMatchObject({
      title: '10.0.1.45 used psexec.exe to reach 10.0.0.1',
      evidenceCount: 34,
      severity: 'high',
    });
  });

  it('omits null and empty fields from humanized evidence', () => {
    const evidence = humanizeEvidence({
      '@timestamp': '2026-07-07T22:59:18.614Z',
      'user.name': 'jsmith',
      'host.name': null,
      'process.command_line': '',
      'destination.ip': '10.0.0.1',
      file_path: null,
    });

    const values = evidence.sections.flatMap(({ fields }) => fields.map(({ value }) => value));
    expect(values).toContain('jsmith');
    expect(values).toContain('10.0.0.1');
    expect(values).not.toContain('');
    expect(values).not.toContain('null');
    expect(evidence.rawInitiallyOpen).toBe(false);
  });

  it('groups directed paths and labels the supporting count', () => {
    const row = {
      'source.ip': '10.0.1.45',
      'process.name': 'net.exe',
      'destination.ip': '10.0.0.1',
      event_count: 17,
      'kibana.alert.severity': 'high',
    };
    const presentation = buildHuntPresentation({
      prompt: 'Hunt for lateral movement',
      artifacts: [evidenceArtifact([row, row])],
    });

    expect(presentation.activityPaths).toHaveLength(1);
    expect(presentation.activityPaths[0]).toMatchObject({
      source: '10.0.1.45',
      action: 'net.exe',
      destination: '10.0.0.1',
      count: 34,
    });
    expect(presentation.activityPaths[0].sentence).toContain('34 events');
  });

  it('hides secondary views without enough applicable data', () => {
    const presentation = buildHuntPresentation({
      prompt: 'Find unusual account activity',
      artifacts: [
        evidenceArtifact([
          {
            'user.name': 'jsmith',
            event_count: 2,
          },
        ]),
      ],
    });

    expect(presentation.secondaryViews).toEqual([]);
  });

  it('tolerates malformed and partial evidence rows without throwing', () => {
    const presentation = buildHuntPresentation({
      prompt: 'Hunt for lateral movement',
      artifacts: [
        // Partial evidence artifact whose rows never arrived.
        {
          id: 'partial',
          type: 'evidence',
          toolId: 'platform.core.execute_esql',
          columns: [],
          rows: undefined as unknown as Array<Record<string, unknown>>,
        },
        // Rows containing non-record entries that must be filtered out.
        {
          id: 'mixed',
          type: 'evidence',
          toolId: 'platform.core.execute_esql',
          query: 'FROM .alerts-security.alerts-*',
          columns: ['user.name'],
          rows: [
            null as unknown as Record<string, unknown>,
            'not-a-row' as unknown as Record<string, unknown>,
            { 'user.name': 't.wilson', 'host.name': 'LAPTOP-SALES04', event_count: 3 },
          ],
        },
      ],
    });

    expect(presentation.findings).toHaveLength(1);
    expect(presentation.findings[0].entities).toContain('t.wilson');
  });

  it('produces an empty presentation for no artifacts', () => {
    const presentation = buildHuntPresentation({ prompt: 'anything', artifacts: [] });

    expect(presentation.findings).toEqual([]);
    expect(presentation.activityPaths).toEqual([]);
    expect(presentation.timeline).toEqual([]);
    expect(presentation.sessions).toEqual([]);
    expect(presentation.secondaryViews).toEqual([]);
  });

  it('groups evidence rows into per-entity sessions with counts and worst severity', () => {
    const presentation = buildHuntPresentation({
      prompt: 'lateral movement',
      artifacts: [
        evidenceArtifact([
          {
            'user.name': 'svc-backup',
            'kibana.alert.rule.name': 'Suspicious login',
            'kibana.alert.severity': 'high',
            '@timestamp': '2026-07-17T10:00:00.000Z',
          },
          {
            'user.name': 'svc-backup',
            'kibana.alert.rule.name': 'Impossible travel',
            'kibana.alert.severity': 'critical',
            '@timestamp': '2026-07-17T11:00:00.000Z',
          },
          { 'host.name': 'web-01', '@timestamp': '2026-07-17T09:00:00.000Z' },
        ]),
      ],
    });

    const svc = presentation.sessions.find((session) => session.name === 'svc-backup');
    expect(svc).toMatchObject({ eventCount: 2, alertCount: 2, severity: 'critical', type: 'user' });
    // svc-backup (critical) sorts before web-01 (no severity).
    expect(presentation.sessions[0].name).toBe('svc-backup');
    expect(presentation.secondaryViews).toContain('sessions');
  });
});
