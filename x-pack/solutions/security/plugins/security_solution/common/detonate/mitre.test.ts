/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetonationThreatBucket } from './mitre';
import { mergeThreatBlocks } from './mitre';

const tactic = (id: string, name: string) => ({
  id,
  name,
  reference: `https://attack.mitre.org/tactics/${id}/`,
});

const technique = (
  id: string,
  name: string,
  subtechnique?: Array<{ id: string; name: string }>
) => ({
  id,
  name,
  reference: `https://attack.mitre.org/techniques/${id}/`,
  subtechnique: subtechnique?.map(({ id: subId, name: subName }) => ({
    id: subId,
    name: subName,
    reference: `https://attack.mitre.org/techniques/${id}/${subId.split('.')[1]}/`,
  })),
});

const bucket = (alertCount: number, threats: DetonationThreatBucket['threats']) => ({
  alertCount,
  threats,
});

describe('mergeThreatBlocks', () => {
  it('returns nothing when no rule carried a mapping', () => {
    expect(mergeThreatBlocks([])).toEqual([]);
    expect(mergeThreatBlocks([bucket(4, [])])).toEqual([]);
  });

  it('builds a tactic with its techniques and subtechniques', () => {
    const merged = mergeThreatBlocks([
      bucket(3, [
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0003', 'Persistence'),
          technique: [
            technique('T1547', 'Boot or Logon Autostart Execution', [
              { id: 'T1547.001', name: 'Registry Run Keys / Startup Folder' },
            ]),
          ],
        },
      ]),
    ]);

    expect(merged).toEqual([
      {
        id: 'TA0003',
        name: 'Persistence',
        reference: 'https://attack.mitre.org/tactics/TA0003/',
        alertCount: 3,
        techniques: [
          {
            id: 'T1547',
            name: 'Boot or Logon Autostart Execution',
            reference: 'https://attack.mitre.org/techniques/T1547/',
            alertCount: 3,
            subtechniques: [
              {
                id: 'T1547.001',
                name: 'Registry Run Keys / Startup Folder',
                reference: 'https://attack.mitre.org/techniques/T1547/001/',
                alertCount: 3,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('sums the alert counts of every rule that named the same tactic', () => {
    const persistence = {
      framework: 'MITRE ATT&CK',
      tactic: tactic('TA0003', 'Persistence'),
      technique: [technique('T1547', 'Boot or Logon Autostart Execution')],
    };

    const [merged] = mergeThreatBlocks([bucket(3, [persistence]), bucket(7, [persistence])]);

    expect(merged.alertCount).toBe(10);
    expect(merged.techniques).toHaveLength(1);
    expect(merged.techniques[0].alertCount).toBe(10);
  });

  it('counts a rule once per node even when it repeats the tactic across blocks', () => {
    // Rules do split one tactic over several blocks. Counting per block would let a single rule
    // report more alerts than it produced.
    const merged = mergeThreatBlocks([
      bucket(5, [
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0005', 'Defense Evasion'),
          technique: [technique('T1027', 'Obfuscated Files or Information')],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0005', 'Defense Evasion'),
          technique: [technique('T1070', 'Indicator Removal')],
        },
      ]),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].alertCount).toBe(5);
    // Equal counts fall back to the name, so "Indicator Removal" comes first.
    expect(merged[0].techniques.map(({ id }) => id)).toEqual(['T1070', 'T1027']);
    expect(merged[0].techniques.map(({ alertCount }) => alertCount)).toEqual([5, 5]);
  });

  it('keeps a technique that belongs to several tactics under each of them', () => {
    const merged = mergeThreatBlocks([
      bucket(4, [
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0002', 'Execution'),
          technique: [technique('T1053', 'Scheduled Task/Job')],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0003', 'Persistence'),
          technique: [technique('T1053', 'Scheduled Task/Job')],
        },
      ]),
    ]);

    expect(merged.map(({ id }) => id)).toEqual(['TA0002', 'TA0003']);
    expect(merged.every(({ techniques }) => techniques[0].id === 'T1053')).toBe(true);
  });

  it('reports the same count for a technique wherever it appears', () => {
    // The count doubles as the pivot's promise, and the Alerts page can only filter on a technique
    // id. A per-branch count would advertise fewer alerts than the click goes on to show.
    const scheduledTask = (tacticId: string, name: string) => ({
      framework: 'MITRE ATT&CK',
      tactic: tactic(tacticId, name),
      technique: [technique('T1053', 'Scheduled Task/Job')],
    });

    const merged = mergeThreatBlocks([
      bucket(2, [
        scheduledTask('TA0002', 'Execution'),
        scheduledTask('TA0003', 'Persistence'),
        scheduledTask('TA0004', 'Privilege Escalation'),
      ]),
      bucket(2, [
        scheduledTask('TA0003', 'Persistence'),
        scheduledTask('TA0004', 'Privilege Escalation'),
      ]),
    ]);

    const counts = merged.map(({ id, techniques }) => [id, techniques[0].alertCount]);
    expect(counts).toEqual([
      ['TA0002', 4],
      ['TA0003', 4],
      ['TA0004', 4],
    ]);
  });

  it('counts a tactic only for the rules that placed something under it', () => {
    // Unlike a technique, a tactic has no pivot to stay consistent with, so its count stays the
    // number of alerts from rules that mapped it.
    const merged = mergeThreatBlocks([
      bucket(2, [
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0002', 'Execution'),
          technique: [technique('T1053', 'Scheduled Task/Job')],
        },
      ]),
      bucket(7, [
        {
          framework: 'MITRE ATT&CK',
          tactic: tactic('TA0003', 'Persistence'),
          technique: [technique('T1053', 'Scheduled Task/Job')],
        },
      ]),
    ]);

    expect(merged.map(({ id, alertCount }) => [id, alertCount])).toEqual([
      ['TA0002', 2],
      ['TA0003', 7],
    ]);
    // Both branches still report the technique's full reach.
    expect(merged.map(({ techniques }) => techniques[0].alertCount)).toEqual([9, 9]);
  });

  it('orders tactics along the kill chain rather than by how many alerts they produced', () => {
    const merged = mergeThreatBlocks([
      bucket(1, [
        { framework: 'MITRE ATT&CK', tactic: tactic('TA0011', 'Command and Control') },
        { framework: 'MITRE ATT&CK', tactic: tactic('TA0002', 'Execution') },
        { framework: 'MITRE ATT&CK', tactic: tactic('TA0005', 'Defense Evasion') },
      ]),
    ]);

    expect(merged.map(({ id }) => id)).toEqual(['TA0002', 'TA0005', 'TA0011']);
  });

  it('keeps a tactic outside the bundled dataset, after the ones inside it', () => {
    const merged = mergeThreatBlocks([
      bucket(1, [
        { framework: 'MITRE ATT&CK', tactic: { id: 'TA9999', name: 'Future Tactic' } },
        { framework: 'MITRE ATT&CK', tactic: tactic('TA0002', 'Execution') },
      ]),
    ]);

    expect(merged.map(({ id }) => id)).toEqual(['TA0002', 'TA9999']);
  });

  it('orders techniques within a tactic by alert count', () => {
    const evasion = (techniqueId: string, name: string) => ({
      framework: 'MITRE ATT&CK',
      tactic: tactic('TA0005', 'Defense Evasion'),
      technique: [technique(techniqueId, name)],
    });

    const [merged] = mergeThreatBlocks([
      bucket(2, [evasion('T1027', 'Obfuscated Files or Information')]),
      bucket(9, [evasion('T1070', 'Indicator Removal')]),
    ]);

    expect(merged.techniques.map(({ id }) => id)).toEqual(['T1070', 'T1027']);
  });

  it('derives a reference for a node that has none', () => {
    const [merged] = mergeThreatBlocks([
      bucket(1, [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0002', name: 'Execution' },
          technique: [{ id: 'T1059.001', name: 'PowerShell' }],
        },
      ]),
    ]);

    expect(merged.reference).toBe('https://attack.mitre.org/tactics/TA0002/');
    expect(merged.techniques[0].reference).toBe('https://attack.mitre.org/techniques/T1059/001/');
  });

  it('reports no reference when the id does not fit the MITRE scheme', () => {
    const [merged] = mergeThreatBlocks([
      bucket(1, [{ framework: 'MITRE ATT&CK', tactic: { id: 'not-a-tactic', name: 'Mystery' } }]),
    ]);

    expect(merged.reference).toBeNull();
  });

  it('skips nodes with no id and falls back to the id when a name is missing', () => {
    const merged = mergeThreatBlocks([
      bucket(1, [
        { framework: 'MITRE ATT&CK', tactic: null },
        { framework: 'MITRE ATT&CK', tactic: { name: 'No id here' } },
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0002' },
          technique: [{ name: 'No id either' }],
        },
      ]),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('TA0002');
    expect(merged[0].techniques).toEqual([]);
  });

  it('keeps the name and reference resolved first when a later rule omits them', () => {
    const [merged] = mergeThreatBlocks([
      bucket(1, [{ framework: 'MITRE ATT&CK', tactic: tactic('TA0002', 'Execution') }]),
      bucket(1, [{ framework: 'MITRE ATT&CK', tactic: { id: 'TA0002' } }]),
    ]);

    expect(merged.name).toBe('Execution');
    expect(merged.reference).toBe('https://attack.mitre.org/tactics/TA0002/');
    expect(merged.alertCount).toBe(2);
  });
});
