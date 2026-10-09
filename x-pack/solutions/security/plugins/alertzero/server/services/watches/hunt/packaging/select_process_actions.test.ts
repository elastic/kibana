/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  DEFEND_ACTION_KINDS,
  selectHostActions,
  selectProcessActions,
} from './select_process_actions';
import type { CurrentRunHost, CurrentRunState, ProcessSelector } from './types';

const host = (capabilities: string[] = []): CurrentRunHost => ({
  name: 'WIN-ANALYST01',
  enrolled: true,
  agentId: 'agent-1',
  capabilities,
});

const selector = (overrides: Partial<ProcessSelector> = {}): ProcessSelector => ({
  pid: 4212,
  processKey: 'pid:4212',
  hostName: 'WIN-ANALYST01',
  processName: 'powershell.exe',
  observedAt: '2026-09-27T16:34:41.000Z',
  iocMatched: false,
  ...overrides,
});

const state = (overrides: Partial<CurrentRunState> = {}): CurrentRunState => ({
  runId: 'run-1',
  reportId: 'rpt-1',
  sseCount: 1,
  hasConfirmedHit: true,
  severity: 'high',
  confidence: 0.7,
  huntWindow: { from: '2026-09-25T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' },
  titles: [],
  evidenceLines: [],
  techniques: [],
  corroboratedTechniques: [],
  hosts: [host()],
  processSelectors: [],
  hasNonHostEntity: false,
  hasIocIndicator: false,
  allEventsActionable: true,
  hasProcessBearingEvent: true,
  manualRemediation: [],
  evidence: { tier2Confirmed: [] },
  ...overrides,
});

const confirmed = (...techniqueIds: string[]): Partial<CurrentRunState> => ({
  evidence: {
    tier2Confirmed: techniqueIds.map((techniqueId) => ({ techniqueId, rowCount: 1 })),
  },
});

describe('DEFEND_ACTION_KINDS', () => {
  it('names the four Defend actions by their exported workflow ids', () => {
    expect(DEFEND_ACTION_KINDS).toEqual({
      [ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID]: 'kill',
      [ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID]: 'suspend',
      [ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID]: 'memory_dump',
      [ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID]: 'isolate',
    });
  });
});

describe('selectProcessActions', () => {
  describe('rule 1: protected system process', () => {
    it('proposes memory dump only when the endpoint can dump, with a held-back line', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'lsass.exe', pid: 640 }),
        host: host(['memdump_process']),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
      expect(decision.actions).toEqual(['memory_dump']);
      expect(decision.why).toMatch(/^Rule: protected system process/);
      expect(decision.heldBack).toContain(
        'Kill and suspend were not proposed for `lsass.exe` (PID 640)'
      );
    });

    it('proposes nothing when the endpoint cannot dump, with a held-back line', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'lsass.exe', pid: 640 }),
        host: host(),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
      expect(decision.actions).toEqual([]);
      expect(decision.heldBack).toContain('does not report memdump_process');
    });

    it('matches on the basename of a full Windows path, case-insensitively', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'C:\\Windows\\System32\\LSASS.EXE' }),
        host: host(),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
    });

    it.each([1, 4])('matches protected pid %s regardless of name', (pid) => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'anything', pid }),
        host: host(),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
    });

    it('protects a protected name running from its real system directory', () => {
      const decision = selectProcessActions({
        selector: selector({
          processName: 'lsass.exe',
          processExecutable: 'C:\\Windows\\System32\\lsass.exe',
        }),
        host: host(['memdump_process']),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
    });

    it('does not protect a look-alike protected name running from elsewhere', () => {
      const decision = selectProcessActions({
        selector: selector({
          processName: 'lsass.exe',
          processExecutable: 'C:\\Users\\bob\\AppData\\Local\\Temp\\lsass.exe',
        }),
        host: host(['memdump_process']),
        state: state(),
      });
      expect(decision.rule).not.toBe('protected_system_process');
    });

    it('falls back to the name alone when there is no executable path', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'lsass.exe' }),
        host: host(),
        state: state(),
      });
      expect(decision.rule).toBe('protected_system_process');
    });

    it('protects systemd under its system directory but not from /tmp', () => {
      expect(
        selectProcessActions({
          selector: selector({
            processName: 'systemd',
            processExecutable: '/usr/lib/systemd/systemd',
          }),
          host: host(),
          state: state(),
        }).rule
      ).toBe('protected_system_process');
      expect(
        selectProcessActions({
          selector: selector({ processName: 'systemd', processExecutable: '/tmp/systemd' }),
          host: host(),
          state: state(),
        }).rule
      ).not.toBe('protected_system_process');
    });

    it('gives way to the stale rule, so a stale protected process proposes nothing', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'lsass.exe', observedAt: '2026-09-24T23:59:59.000Z' }),
        host: host(['memdump_process']),
        state: state(),
      });
      expect(decision.rule).toBe('stale');
      expect(decision.actions).toEqual([]);
    });

    it('beats a confirmed destructive technique (order: 1 before 3)', () => {
      const decision = selectProcessActions({
        selector: selector({ processName: 'lsass.exe' }),
        host: host(['memdump_process']),
        state: state(confirmed('T1486')),
      });
      expect(decision.rule).toBe('protected_system_process');
      expect(decision.actions).not.toContain('kill');
    });
  });

  describe('rule 2: stale', () => {
    it('proposes nothing when the process was last seen before the hunt window opened', () => {
      const decision = selectProcessActions({
        selector: selector({ observedAt: '2026-09-24T23:59:59.000Z' }),
        host: host(['memdump_process']),
        state: state(),
      });
      expect(decision.rule).toBe('stale');
      expect(decision.actions).toEqual([]);
      expect(decision.heldBack).toContain(
        'last seen 2026-09-24T23:59:59.000Z, outside the response window'
      );
    });

    it('proposes nothing when the process was last seen more than 7 days before the window closed', () => {
      const decision = selectProcessActions({
        selector: selector({ observedAt: '2026-09-10T00:00:00.000Z' }),
        host: host(),
        state: state({
          huntWindow: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' },
        }),
      });
      expect(decision.rule).toBe('stale');
    });

    it('is never stale without observedAt', () => {
      const decision = selectProcessActions({
        selector: selector({ observedAt: undefined }),
        host: host(),
        state: state(),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('is never stale without a hunt window', () => {
      const decision = selectProcessActions({
        selector: selector({ observedAt: '2020-01-01T00:00:00.000Z' }),
        host: host(),
        state: state({ huntWindow: undefined }),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('beats a confirmed destructive technique (order: 2 before 3)', () => {
      const decision = selectProcessActions({
        selector: selector({ observedAt: '2026-09-24T00:00:00.000Z' }),
        host: host(),
        state: state(confirmed('T1486')),
      });
      expect(decision.rule).toBe('stale');
    });
  });

  describe('rule 3: destructive technique', () => {
    it.each(['T1486', 'T1485', 'T1490', 'T1489', 'T1561'])('kills on confirmed %s', (id) => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: id, techniqueIds: [id] }),
        host: host(['memdump_process']),
        state: state(confirmed(id)),
      });
      expect(decision.rule).toBe('destructive_technique');
      expect(decision.actions).toEqual(['kill']);
      expect(decision.why).toBe(
        `Rule: destructive technique; ${id} was confirmed in this finding, so the process is killed rather than suspended`
      );
    });

    it('matches a sub-technique on its prefix', () => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: 'T1486.001', techniqueIds: ['T1486.001'] }),
        host: host(),
        state: state(confirmed('T1486.001')),
      });
      expect(decision.rule).toBe('destructive_technique');
    });

    it('reads confirmed Tier 2 techniques, never the report SKI list', () => {
      const decision = selectProcessActions({
        selector: selector(),
        host: host(),
        state: state({ techniques: ['T1486'], evidence: { tier2Confirmed: [] } }),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('judges an attributed process on its own technique, not another process’s', () => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: 'T1059.001' }),
        host: host(),
        state: state({
          evidence: {
            tier2Confirmed: [
              { techniqueId: 'T1486', rowCount: 1 },
              { techniqueId: 'T1059.001', rowCount: 1 },
            ],
          },
        }),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('kills when any of the process’s attributed techniques is destructive and confirmed', () => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: 'T1059.001', techniqueIds: ['T1059.001', 'T1486'] }),
        host: host(),
        state: state({
          evidence: {
            tier2Confirmed: [
              { techniqueId: 'T1486', rowCount: 1 },
              { techniqueId: 'T1059.001', rowCount: 1 },
            ],
          },
        }),
      });
      expect(decision.rule).toBe('destructive_technique');
    });

    it('matches roots on both sides: an attributed T1486 is killed when T1486.001 is confirmed', () => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: 'T1486', techniqueIds: ['T1486'] }),
        host: host(),
        state: state(confirmed('T1486.001')),
      });
      expect(decision.rule).toBe('destructive_technique');
    });

    it('kills an attributed process whose own technique is destructive and confirmed', () => {
      const decision = selectProcessActions({
        selector: selector({ techniqueId: 'T1486.001' }),
        host: host(),
        state: state(confirmed('T1486.001')),
      });
      expect(decision.rule).toBe('destructive_technique');
    });

    it('does not kill an unattributed process just because the run confirmed a destructive technique', () => {
      const decision = selectProcessActions({
        selector: selector(),
        host: host(),
        state: state(confirmed('T1486')),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('beats a critical IOC match (order: 3 before 4)', () => {
      const decision = selectProcessActions({
        selector: selector({ iocMatched: true, techniqueId: 'T1486', techniqueIds: ['T1486'] }),
        host: host(),
        state: state({ severity: 'critical', ...confirmed('T1486') }),
      });
      expect(decision.rule).toBe('destructive_technique');
    });
  });

  describe('rule 4: critical IOC match', () => {
    it('kills when severity is critical and the process was the Tier 1 IOC match, even without memdump_process', () => {
      const decision = selectProcessActions({
        selector: selector({ iocMatched: true }),
        host: host(),
        state: state({ severity: 'critical' }),
      });
      expect(decision.rule).toBe('critical_ioc_match');
      expect(decision.actions).toEqual(['kill']);
      expect(decision.why).toMatch(/^Rule: critical IOC match/);
    });

    it('does not fire on critical severity alone', () => {
      const decision = selectProcessActions({
        selector: selector({ iocMatched: false }),
        host: host(),
        state: state({ severity: 'critical' }),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('does not fire on an IOC match below critical', () => {
      const decision = selectProcessActions({
        selector: selector({ iocMatched: true }),
        host: host(),
        state: state({ severity: 'high' }),
      });
      expect(decision.rule).toBe('suspend_only');
    });

    it('beats the suspend + dump default (order: 4 before 5)', () => {
      const decision = selectProcessActions({
        selector: selector({ iocMatched: true }),
        host: host(['memdump_process']),
        state: state({ severity: 'critical' }),
      });
      expect(decision.rule).toBe('critical_ioc_match');
      expect(decision.actions).toEqual(['kill']);
    });
  });

  describe('rules 5 and 6: default', () => {
    it('suspends and dumps when the endpoint reports memdump_process', () => {
      const decision = selectProcessActions({
        selector: selector(),
        host: host(['isolation', 'memdump_process']),
        state: state(),
      });
      expect(decision.rule).toBe('suspend_and_dump');
      expect(decision.actions).toEqual(['suspend', 'memory_dump']);
      expect(decision.why).toBe(
        'Rule: default response; the endpoint reports memdump_process, so a memory dump is proposed alongside the suspend'
      );
      expect(decision.heldBack).toBeUndefined();
    });

    it('suspends only when the endpoint does not report memdump_process', () => {
      const decision = selectProcessActions({
        selector: selector(),
        host: host(['isolation']),
        state: state(),
      });
      expect(decision.rule).toBe('suspend_only');
      expect(decision.actions).toEqual(['suspend']);
      expect(decision.why).toBe(
        'Rule: default response; the endpoint does not report memdump_process, so suspend is the only process action proposed'
      );
      expect(decision.heldBack).toBeUndefined();
    });
  });
});

describe('selectHostActions', () => {
  it.each(['T1021', 'T1071', 'T1041', 'T1048', 'T1570'])(
    'isolates on confirmed %s even with one process and severity below critical',
    (id) => {
      const decision = selectHostActions({
        host: host(['isolation']),
        state: state(confirmed(id)),
        activeProcessCount: 1,
        hostTechniqueIds: [id],
      });
      expect(decision.rule).toBe('lateral_or_c2_technique');
      expect(decision.isolate).toBe(true);
      expect(decision.why).toContain(id);
    }
  );

  it('matches an isolate sub-technique on its prefix', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state(confirmed('T1021.002')),
      activeProcessCount: 1,
      hostTechniqueIds: ['T1021.002'],
    });
    expect(decision.rule).toBe('lateral_or_c2_technique');
    expect(decision.why).toContain('T1021.002');
  });

  it('isolates on two or more suspicious processes', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state(),
      hostTechniqueIds: [],
      activeProcessCount: 2,
    });
    expect(decision.rule).toBe('multiple_processes');
    expect(decision.isolate).toBe(true);
    expect(decision.why).toBe(
      'Rule: multiple suspicious processes; 2 suspicious processes were observed on this host'
    );
  });

  it('isolates on critical severity with a single process', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state({ severity: 'critical' }),
      hostTechniqueIds: [],
      activeProcessCount: 1,
    });
    expect(decision.rule).toBe('critical_severity');
    expect(decision.isolate).toBe(true);
  });

  it('orders technique before count before severity', () => {
    const all = selectHostActions({
      host: host(['isolation']),
      state: state({ severity: 'critical', ...confirmed('T1021') }),
      activeProcessCount: 3,
      hostTechniqueIds: ['T1021'],
    });
    expect(all.rule).toBe('lateral_or_c2_technique');

    const countAndSeverity = selectHostActions({
      host: host(['isolation']),
      state: state({ severity: 'critical' }),
      hostTechniqueIds: [],
      activeProcessCount: 3,
    });
    expect(countAndSeverity.rule).toBe('multiple_processes');
  });

  it('holds isolate back otherwise and says why', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state({ severity: 'high', ...confirmed('T1059.001') }),
      hostTechniqueIds: [],
      activeProcessCount: 1,
    });
    expect(decision.rule).toBe('not_warranted');
    expect(decision.isolate).toBe(false);
    expect(decision.heldBack).toBe(
      'Isolate host WIN-ANALYST01 was not proposed: 1 suspicious process, no lateral movement, C2, or exfiltration technique confirmed on this host, severity high'
    );
  });

  it('pluralizes the held-back process count', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state(),
      hostTechniqueIds: [],
      activeProcessCount: 0,
    });
    expect(decision.heldBack).toContain('0 suspicious processes');
  });

  it('holds a warranted isolate back when the host does not report isolation', () => {
    const decision = selectHostActions({
      host: host(['memdump_process']),
      state: state(confirmed('T1071')),
      activeProcessCount: 1,
      hostTechniqueIds: ['T1071'],
    });
    expect(decision.rule).toBe('isolation_unsupported');
    expect(decision.isolate).toBe(false);
    expect(decision.heldBack).toContain('Isolate host WIN-ANALYST01 was not proposed');
    expect(decision.heldBack).toContain('does not report isolation');
  });

  it('does not add an isolation hold-back when isolate was not warranted anyway', () => {
    const decision = selectHostActions({
      host: host(),
      state: state(),
      activeProcessCount: 1,
      hostTechniqueIds: [],
    });
    expect(decision.rule).toBe('not_warranted');
    expect(decision.heldBack).not.toContain('isolation');
  });

  it('does not isolate a host for a technique that was only attributed to another host', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state(confirmed('T1071')),
      activeProcessCount: 1,
      hostTechniqueIds: [],
    });
    expect(decision.rule).toBe('not_warranted');
    expect(decision.isolate).toBe(false);
  });

  it('does not isolate on critical severity alone when the host has no live process evidence', () => {
    const decision = selectHostActions({
      host: host(['isolation']),
      state: state({ severity: 'critical' }),
      activeProcessCount: 0,
      hostTechniqueIds: [],
    });
    expect(decision.rule).toBe('not_warranted');
  });
});
