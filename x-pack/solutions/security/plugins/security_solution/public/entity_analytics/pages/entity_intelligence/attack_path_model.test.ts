/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import {
  KILL_CHAIN_ORDER,
  buildAttackPath,
  computeFocusSet,
  tacticToStage,
} from './attack_path_model';
import type { AttackPathFocus, AttackPathNeighbor, KillChainStage } from './attack_path_model';
import type { TimelineStep } from './timeline_model';

const STAGE_LABELS = Object.fromEntries(KILL_CHAIN_ORDER.map((stage) => [stage, stage])) as Record<
  KillChainStage,
  string
>;

const focus = (over: Partial<AttackPathFocus> = {}): AttackPathFocus => ({
  name: 'docker-host-prod-01',
  kind: EntityType.host,
  identifierValue: 'docker-host-prod-01',
  worstSeverity: 'critical',
  alertCount: 11,
  criticality: 'high_impact',
  ...over,
});

const neighbor = (over: Partial<AttackPathNeighbor> = {}): AttackPathNeighbor => ({
  id: `${EntityType.user}:a.rodriguez`,
  name: 'a.rodriguez',
  kind: EntityType.user,
  alertCount: 5,
  worstSeverity: 'critical',
  activity: 'reached 185.220.101.5:4444',
  criticality: undefined,
  destinationIp: undefined,
  ...over,
});

const step = (over: Partial<TimelineStep> = {}): TimelineStep => ({
  id: 'alert:a1',
  kind: 'alert',
  category: undefined,
  timestamp: 1,
  host: 'docker-host-prod-01',
  user: 'a.rodriguez',
  severity: 'critical',
  label: 'Untrusted Container Image Deployed on Production Host',
  detail: undefined,
  alertRuleName: 'Untrusted Container Image Deployed on Production Host',
  contributedToAlertId: undefined,
  tacticName: 'Execution',
  reasons: [],
  significanceScore: 10,
  depth: 0,
  refId: 'a1',
  refIndex: '.alerts-security.alerts-default',
  ...over,
});

const build = (over: Partial<Parameters<typeof buildAttackPath>[0]> = {}) =>
  buildAttackPath({
    focus: focus(),
    neighbors: [],
    steps: [],
    stageLabels: STAGE_LABELS,
    originLabel: 'Internet',
    ...over,
  });

describe('tacticToStage', () => {
  it('maps known MITRE tactics to kill-chain stages, case-insensitively', () => {
    expect(tacticToStage('Initial Access')).toBe('initial-access');
    expect(tacticToStage('privilege escalation')).toBe('privilege-escalation');
    expect(tacticToStage('Command and Control')).toBe('command-and-control');
    expect(tacticToStage('Exfiltration')).toBe('exfiltration');
  });

  it('returns undefined for unknown / empty tactics', () => {
    expect(tacticToStage('Nonsense')).toBeUndefined();
    expect(tacticToStage(undefined)).toBeUndefined();
  });
});

describe('buildAttackPath — spine', () => {
  it('starts the spine at the real focus when there is NO external-entry signal', () => {
    const path = build();
    // No synthesized Internet origin in the common case.
    expect(path.spine.some((n) => n.kind === 'origin')).toBe(false);
    expect(path.spine[0].name).toBe('docker-host-prod-01');
    expect(path.spine[0].id).toBe(`${EntityType.host}:docker-host-prod-01`);
  });

  it('prepends an Internet/external origin ONLY when a real external-entry signal exists', () => {
    const path = build({ externalEntry: { sourceIp: '198.235.24.58', count: 28 } });
    expect(path.spine[0].kind).toBe('origin');
    expect(path.spine[0].name).toBe('Internet');
    // The origin carries the grounding source IP + observed count.
    expect(path.spine[0].identifierValue).toBe('198.235.24.58');
    expect(path.spine[0].alertCount).toBe(28);
    expect(path.spine[1].name).toBe('docker-host-prod-01');
  });

  it('orders neighbors by shared-alert strength then severity then name', () => {
    const path = build({
      neighbors: [
        neighbor({ id: 'u:weak', name: 'weak', alertCount: 1, worstSeverity: 'low' }),
        neighbor({ id: 'u:strong', name: 'strong', alertCount: 9, worstSeverity: 'high' }),
        neighbor({ id: 'u:mid', name: 'mid', alertCount: 5, worstSeverity: 'high' }),
      ],
    });
    // focus at [0], neighbors follow.
    const neighborNames = path.spine.slice(1).map((n) => n.name);
    expect(neighborNames).toEqual(['strong', 'mid', 'weak']);
  });

  it('caps the spine at the configured neighbor limit', () => {
    const neighbors = Array.from({ length: 10 }, (_, i) =>
      neighbor({ id: `u:${i}`, name: `n${i}`, alertCount: 10 - i })
    );
    const path = build({ neighbors, spineLimit: 3 });
    // focus + 3 neighbors (no origin without external entry).
    expect(path.spine).toHaveLength(4);
  });

  it('carries the event-context phrase as the transition into a neighbor', () => {
    const path = build({ neighbors: [neighbor({ activity: 'spawned process docker' })] });
    expect(path.spine[1].transition).toBe('spawned process docker');
  });
});

describe('buildAttackPath — stages', () => {
  it('places the focus at the earliest kill-chain stage on its timeline', () => {
    const path = build({
      steps: [
        step({ tacticName: 'Execution' }),
        step({ id: 'alert:a2', tacticName: 'Initial Access' }),
      ],
    });
    expect(path.spine[0].stage).toBe('initial-access');
  });

  it('never assigns tactic progression to neighbors without matching alert evidence', () => {
    const path = build({
      steps: [step({ tacticName: 'Initial Access' })],
      neighbors: [neighbor({ id: 'u:1', name: 'one' }), neighbor({ id: 'u:2', name: 'two' })],
    });
    expect(path.spine[0].stage).toBe('initial-access');
    expect(path.spine[1].stage).toBeUndefined();
    expect(path.spine[2].stage).toBeUndefined();
    expect(build().spine[0].stage).toBeUndefined();
  });

  it('attributes an observed tactic only to the matching typed entity', () => {
    const path = build({
      steps: [step({ host: 'same', user: 'other', tacticName: 'Execution' })],
      neighbors: [
        neighbor({ id: 'host:same', kind: EntityType.host, name: 'same' }),
        neighbor({ id: 'user:same', kind: EntityType.user, name: 'same' }),
      ],
    });
    expect(path.spine.find((node) => node.id === 'host:same')?.stage).toBe('execution');
    expect(path.spine.find((node) => node.id === 'user:same')?.stage).toBeUndefined();
  });

  it('groups contiguous same-stage nodes into a single stage band', () => {
    const path = build({
      steps: [step({ tacticName: 'Lateral Movement' })],
      neighbors: [neighbor({ id: 'u:1', name: 'one' })],
    });
    // Each band's stage label is present and node ids are covered.
    const covered = path.stages.flatMap((band) => band.nodeIds);
    expect(covered.length).toBeGreaterThan(0);
    expect(path.stages.every((band) => band.label === band.stage)).toBe(true);
  });
});

describe('buildAttackPath — crown jewels', () => {
  it('flags a focus with sensitive asset criticality', () => {
    const path = build({ focus: focus({ criticality: 'high_impact' }) });
    const jewel = path.crownJewels.find((j) => j.kind === 'sensitive-host');
    expect(jewel?.name).toBe('docker-host-prod-01');
    expect(jewel?.reason).toContain('high impact');
  });

  it('does not infer sensitive data stores from a host name', () => {
    const path = build({
      focus: focus({ criticality: undefined }),
      neighbors: [neighbor({ id: 'host:db-prod-03', name: 'db-prod-03', kind: EntityType.host })],
    });
    const jewel = path.crownJewels.find((j) => j.kind === 'data-store');
    expect(jewel).toBeUndefined();
  });

  it('flags a routable outbound destination as an exfil leaf, ignoring private IPs', () => {
    const path = build({
      neighbors: [
        neighbor({ id: 'u:exfil', name: 'exfil-user', destinationIp: '185.220.101.5' }),
        neighbor({ id: 'u:internal', name: 'internal-user', destinationIp: '10.0.6.10' }),
      ],
    });
    const exfil = path.crownJewels.filter((j) => j.kind === 'exfil-destination');
    expect(exfil).toHaveLength(1);
    expect(exfil[0].name).toBe('185.220.101.5');
  });

  it('does not invent PCI/PII labels', () => {
    const path = build({ focus: focus({ criticality: undefined }), neighbors: [] });
    expect(path.crownJewels.every((j) => !/pci|pii/i.test(j.reason))).toBe(true);
  });
});

describe('buildAttackPath — annotations', () => {
  it('grounds annotations in real alert rule names and event phrases', () => {
    const path = build({
      neighbors: [neighbor()],
      steps: [
        step({
          id: 'alert:a1',
          kind: 'alert',
          alertRuleName: 'Untrusted Container Image Deployed',
        }),
        step({
          id: 'event:e1',
          kind: 'event',
          host: 'docker-host-prod-01',
          label: 'spawned process docker',
          alertRuleName: undefined,
          tacticName: undefined,
        }),
      ],
    });
    const alertAnnotation = path.annotations.find((a) => a.kind === 'alert');
    const activityAnnotation = path.annotations.find((a) => a.kind === 'activity');
    expect(alertAnnotation?.text).toBe('Untrusted Container Image Deployed');
    expect(activityAnnotation?.text).toBe('spawned process docker');
  });

  it('anchors annotations to the spine node matching the step host/user', () => {
    const path = build({
      neighbors: [neighbor()],
      steps: [step({ host: 'docker-host-prod-01' })],
    });
    const focusId = `${EntityType.host}:docker-host-prod-01`;
    expect(path.annotations[0].nodeId).toBe(focusId);
  });

  it('alternates annotations above and below the spine', () => {
    const path = build({
      steps: [
        step({ id: 'a1', host: 'docker-host-prod-01' }),
        step({ id: 'a2', host: 'docker-host-prod-01' }),
      ],
    });
    expect(path.annotations[0].above).toBe(true);
    expect(path.annotations[1].above).toBe(false);
  });
});

describe('buildAttackPath — sparse fallback', () => {
  it('marks a path with no neighbors and no findings as sparse', () => {
    const path = build({ neighbors: [], steps: [] });
    expect(path.isSparse).toBe(true);
    // Minimal path is just the focus when there is no external-entry signal.
    expect(path.spine).toHaveLength(1);
    expect(path.spine[0].kind).not.toBe('origin');
  });

  it('is not sparse when there are neighbors', () => {
    const path = build({ neighbors: [neighbor()], steps: [] });
    expect(path.isSparse).toBe(false);
  });
});

describe('buildAttackPath — crown-jewel detail data', () => {
  it('carries the parent it was reached from and the parent alert count for the leaf detail', () => {
    const path = build({
      focus: focus({ criticality: 'extreme_impact', alertCount: 7 }),
    });
    const jewel = path.crownJewels.find((j) => j.kind === 'sensitive-host');
    expect(jewel?.reachedFrom).toBe('docker-host-prod-01');
    expect(jewel?.alertCount).toBe(7);
  });
});

describe('computeFocusSet', () => {
  const path = () =>
    build({
      externalEntry: { sourceIp: '198.235.24.58', count: 5 },
      neighbors: [
        neighbor({ id: 'u:mid', name: 'mid', alertCount: 5 }),
        neighbor({ id: 'u:tail', name: 'tail', alertCount: 1, destinationIp: '185.220.101.5' }),
      ],
    });

  it('returns empty sets (no dimming) when nothing is selected', () => {
    const { spine, crownJewels } = path();
    const result = computeFocusSet(spine, crownJewels, undefined);
    expect(result.highlighted.size).toBe(0);
    expect(result.dimmed.size).toBe(0);
  });

  it('highlights the path prefix up to the selection and dims what follows', () => {
    const { spine, crownJewels } = path();
    // Select the focus (index 1: origin, focus, mid, tail).
    const focusId = spine[1].id;
    const result = computeFocusSet(spine, crownJewels, focusId);
    expect(result.highlighted.has(spine[0].id)).toBe(true); // origin
    expect(result.highlighted.has(spine[1].id)).toBe(true); // focus
    expect(result.dimmed.has(spine[2].id)).toBe(true); // mid (after selection)
    expect(result.dimmed.has(spine[3].id)).toBe(true); // tail
  });

  it('selecting a leaf highlights its parent path and the leaf itself', () => {
    const { spine, crownJewels } = path();
    const exfil = crownJewels.find((j) => j.kind === 'exfil-destination');
    if (!exfil) throw new Error('expected an exfil leaf in the fixture');
    const result = computeFocusSet(spine, crownJewels, exfil.id);
    // The leaf's parent node and everything before it are highlighted.
    expect(result.highlighted.has(exfil.nodeId)).toBe(true);
    expect(result.highlighted.has(exfil.id)).toBe(true);
  });

  it('dims leaves whose parent is dimmed', () => {
    const { spine, crownJewels } = path();
    // Select the origin — only origin highlighted, all downstream dimmed.
    const result = computeFocusSet(spine, crownJewels, spine[0].id);
    for (const leaf of crownJewels) {
      expect(result.dimmed.has(leaf.id)).toBe(true);
    }
  });
  it('does not highlight an unrelated neighbor as an intermediate pivot', () => {
    const { spine, crownJewels } = path();
    const result = computeFocusSet(spine, crownJewels, spine[3].id);
    expect(result.highlighted.has(spine[1].id)).toBe(true);
    expect(result.highlighted.has(spine[3].id)).toBe(true);
    expect(result.dimmed.has(spine[2].id)).toBe(true);
  });
});
