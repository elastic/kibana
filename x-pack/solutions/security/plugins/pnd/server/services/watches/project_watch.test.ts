/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectTriggers,
  projectSchedule,
  projectCallablesFromDefinition,
  projectWorkflowToWatch,
  projectRecentRunsFromHistory,
  buildCustomWatchYaml,
} from './project_watch';
import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import * as yamlLib from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

// YAML files are imported as raw strings in Jest (via raw.js transform).
// Load them directly from disk and parse with `yaml` for test fixtures.
const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);
const WATCH_DEEP_YAML = yamlLib.parse(
  fs.readFileSync(path.join(YAML_DIR, 'watch_deep_orchestrator.yaml'), 'utf8')
) as WorkflowYaml;
const WATCH_DARK_YAML = yamlLib.parse(
  fs.readFileSync(path.join(YAML_DIR, 'watch_dark_orchestrator.yaml'), 'utf8')
) as WorkflowYaml;
const WATCH_FLOOR_YAML = yamlLib.parse(
  fs.readFileSync(path.join(YAML_DIR, 'watch_floor_orchestrator.yaml'), 'utf8')
) as WorkflowYaml;

// ── helpers ──────────────────────────────────────────────────────────────

const parseYaml = (raw: string): WorkflowYaml => yamlLib.parse(raw) as WorkflowYaml;

const makeListItem = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'test-watch',
  name: 'Test Watch',
  description: 'A test watch',
  enabled: true,
  managed: false,
  managedBy: null,
  definition: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  tags: ['watch'],
  history: [],
  valid: true,
  ...overrides,
});

// ── extractWatchPolicy ────────────────────────────────────────────────────

describe('extractWatchPolicy', () => {
  it('returns undefined when definition is null', () => {
    expect(extractWatchPolicy(null)).toBeUndefined();
  });

  it('returns undefined when definition has no steps', () => {
    expect(extractWatchPolicy({ version: '1', name: 'x', steps: [] } as any)).toBeUndefined();
  });

  it('returns undefined when no step has a watch policy', () => {
    const def = {
      version: '1',
      name: 'x',
      steps: [{ name: 'go', type: 'console', with: { message: 'hi' } }],
    } as any;
    expect(extractWatchPolicy(def)).toBeUndefined();
  });

  it('extracts watch policy from data.set step with watch block', () => {
    const def = {
      version: '1',
      name: 'x',
      steps: [
        {
          name: 'watch_policy',
          type: 'data.set',
          with: {
            watch: {
              mandate: 'Hunt',
              autonomyLevel: 3,
              onDemand: true,
              cadence: 'sweep',
            },
          },
        },
      ],
    } as any;
    const policy = extractWatchPolicy(def);
    expect(policy).toBeDefined();
    expect(policy!.mandate).toBe('Hunt');
    expect(policy!.autonomyLevel).toBe(3);
    expect(policy!.onDemand).toBe(true);
  });

  it('extracts watch policy from real Deep Watch YAML', () => {
    const policy = extractWatchPolicy(WATCH_DEEP_YAML);
    expect(policy).toBeDefined();
    expect(policy!.mandate).toContain('investigation');
    expect(policy!.autonomyLevel).toBeGreaterThanOrEqual(1);
  });

  it('extracts watch policy from real Dark Watch YAML', () => {
    const policy = extractWatchPolicy(WATCH_DARK_YAML);
    expect(policy).toBeDefined();
    expect(policy!.cadence).toBe('sweep');
  });
});

// ── projectTriggers ───────────────────────────────────────────────────────

describe('projectTriggers', () => {
  it('returns empty array when no triggers', () => {
    expect(projectTriggers(null)).toEqual([]);
  });

  it('maps scheduled trigger to schedule type', () => {
    const def = parseYaml(`
version: "1"
name: test
triggers:
  - type: scheduled
    with:
      every: "60m"
steps: []
`);
    const triggers = projectTriggers(def);
    expect(triggers).toHaveLength(1);
    expect(triggers[0].type).toBe('schedule');
    expect(triggers[0].summary).toContain('60m');
  });

  it('maps alert trigger to event type', () => {
    const def = parseYaml(`
version: "1"
name: test
triggers:
  - type: alert
steps: []
`);
    const triggers = projectTriggers(def);
    expect(triggers[0].type).toBe('event');
    expect(triggers[0].summary).toBe('On alert');
  });

  it('maps unknown trigger to manual', () => {
    const def = parseYaml(`
version: "1"
name: test
triggers:
  - type: manual
steps: []
`);
    const triggers = projectTriggers(def);
    expect(triggers[0].type).toBe('manual');
    expect(triggers[0].summary).toBe('Manual / on demand');
  });

  it('extracts triggers from Dark Watch YAML (scheduled + manual)', () => {
    const triggers = projectTriggers(WATCH_DARK_YAML);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    const types = triggers.map((t) => t.type);
    expect(types).toContain('schedule');
  });
});

// ── normalizeWorkflowTriggerType ───────────────────────────────────────────

describe('normalizeWorkflowTriggerType', () => {
  it.each([
    ['scheduled', 'schedule'],
    ['schedule', 'schedule'],
    ['manual', 'manual'],
    [undefined, 'manual'],
    ['alert', 'event'],
    ['cases.caseCreated', 'event'],
    ['workflow-step', 'event'],
  ] as const)('maps %s to %s', (source, expected) => {
    expect(normalizeWorkflowTriggerType(source)).toBe(expected);
  });
});

// ── projectSchedule ───────────────────────────────────────────────────────

describe('projectSchedule', () => {
  it('defaults to demand mode with no triggers and no policy', () => {
    const schedule = projectSchedule([], undefined);
    expect(schedule.mode).toBe('demand');
    expect(schedule.onDemand).toBe(false);
    expect(schedule.set).toBe(false);
  });

  it('sets window mode when schedule trigger exists', () => {
    const schedule = projectSchedule([{ type: 'schedule', summary: 's' }], undefined);
    expect(schedule.mode).toBe('window');
    expect(schedule.set).toBe(true);
  });

  it('sets always mode when event trigger exists without schedule', () => {
    const schedule = projectSchedule([{ type: 'event', summary: 'e' }], undefined);
    expect(schedule.mode).toBe('always');
    expect(schedule.set).toBe(true);
  });

  it('uses actual manual-only triggers instead of an incompatible policy mode', () => {
    expect(
      projectSchedule([{ type: 'manual', summary: 'Manual / on demand' }], {
        mode: 'always',
        cadence: 'stream',
        onDemand: false,
      } as any)
    ).toMatchObject({ mode: 'demand', cadence: 'manual', set: false, onDemand: true });
  });

  it('preserves a configured window for scheduled watches', () => {
    expect(
      projectSchedule([{ type: 'schedule', summary: 'Scheduled' }], {
        mode: 'window',
        from: 22,
        to: 6,
      } as any)
    ).toMatchObject({ mode: 'window', set: true, from: 22, to: 6 });
  });

  it('respects policy.onDemand override', () => {
    const schedule = projectSchedule([], { onDemand: true } as any);
    expect(schedule.onDemand).toBe(true);
  });

  it('respects policy.mode override over trigger inference', () => {
    const schedule = projectSchedule([{ type: 'schedule', summary: 's' }], {
      mode: 'demand',
    } as any);
    expect(schedule.mode).toBe('demand');
    expect(schedule.set).toBe(false); // demand mode → set=false
  });

  it('draft=true forces set=false even in window mode', () => {
    const schedule = projectSchedule([{ type: 'schedule', summary: 's' }], {
      draft: true,
      mode: 'window',
    } as any);
    expect(schedule.set).toBe(false);
  });

  it('uses default from/to hours when not specified', () => {
    const schedule = projectSchedule([], undefined);
    expect(schedule.from).toBe(8);
    expect(schedule.to).toBe(18);
  });
});

// ── projectCallables (via projectWorkflowToWatch) ─────────────────────────

describe('projectWorkflowToWatch — callables', () => {
  it('extracts skill URIs from ai.agent steps', () => {
    const def = parseYaml(`
version: "1"
name: test
steps:
  - name: watch_policy
    type: data.set
    with:
      watch:
        mandate: Test
  - name: run
    type: ai.agent
    with:
      instructions: Run skill://deep-watch-forensics
`);
    const watch = projectWorkflowToWatch(makeListItem({ definition: def }));
    expect(watch.callables).toHaveLength(1);
    expect(watch.callables[0].id).toBe('deep-watch-forensics');
    expect(watch.callables[0].kind).toBe('skill');
  });

  it('extracts the delegated worker from Dark Watch orchestrator YAML', () => {
    const watch = projectWorkflowToWatch(
      makeListItem({
        id: 'system-security-watch-dark',
        name: 'Dark Watch',
        definition: WATCH_DARK_YAML,
        managed: true,
      })
    );
    expect(watch.callables.length).toBeGreaterThanOrEqual(1);
    // Post-D10 the orchestrator delegates via `workflow.execute`; the skill
    // itself is invoked one level down, inside the worker.
    const callableIds = watch.callables.map((c) => c.id);
    expect(callableIds).toContain('system-security-watch-dark-worker');
    expect(watch.callables.find((c) => c.id === 'system-security-watch-dark-worker')?.kind).toBe(
      'workflow'
    );
  });

  it('extracts the delegated worker from Deep Watch orchestrator YAML', () => {
    const watch = projectWorkflowToWatch(
      makeListItem({
        id: 'system-security-watch-deep',
        name: 'Deep Watch',
        definition: WATCH_DEEP_YAML,
        managed: true,
      })
    );
    expect(watch.callables.length).toBeGreaterThanOrEqual(1);
    const callableIds = watch.callables.map((c) => c.id);
    expect(callableIds).toContain('system-security-watch-deep-worker');
  });

  it('extracts the delegated worker from Watch Floor orchestrator YAML', () => {
    const watch = projectWorkflowToWatch(
      makeListItem({
        id: 'system-security-watch-floor',
        name: 'Watch Floor',
        definition: WATCH_FLOOR_YAML,
        managed: true,
      })
    );
    const callableIds = watch.callables.map((c) => c.id);
    expect(callableIds).toContain('system-security-watch-floor-worker');
  });

  it('humanizes skill ids when no name override provided', () => {
    const def = parseYaml(`
version: "1"
name: test
steps:
  - name: run
    type: ai.agent
    with:
      instructions: Use skill://threat-intelligence
`);
    const watch = projectWorkflowToWatch(makeListItem({ definition: def }));
    expect(watch.callables[0].name).toBe('Threat Intelligence');
  });

  it('respects callables override from watch policy', () => {
    const def = parseYaml(`
version: "1"
name: test
steps:
  - name: watch_policy
    type: data.set
    with:
      watch:
        mandate: Test
        callables:
          - id: threat-intelligence
            name: "TI Skill"
            summary: "Correlates IoCs"
            gated: true
            enabled: false
  - name: run
    type: ai.agent
    with:
      instructions: Run skill://threat-intelligence
`);
    const watch = projectWorkflowToWatch(makeListItem({ definition: def }));
    expect(watch.callables).toHaveLength(1);
    expect(watch.callables[0].name).toBe('TI Skill');
    expect(watch.callables[0].summary).toBe('Correlates IoCs');
    expect(watch.callables[0].gated).toBe(true);
    expect(watch.callables[0].enabled).toBe(false);
  });

  it('discovers workflow callables nested in branch containers', () => {
    const definition = {
      version: '1',
      name: 'Nested callables',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'parallel_work',
          type: 'parallel',
          branches: [
            {
              name: 'worker_branch',
              steps: [
                {
                  name: 'run_worker',
                  type: 'workflow.executeAsync',
                  with: { workflowId: 'system-security-worker' },
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkflowYaml;

    expect(projectCallablesFromDefinition(definition, undefined)).toEqual([
      expect.objectContaining({ id: 'system-security-worker', kind: 'workflow' }),
    ]);
  });
});

// ── projectWorkflowToWatch — full projection ──────────────────────────────

describe('projectWorkflowToWatch — full projection', () => {
  it('projects a minimal watch with defaults', () => {
    const watch = projectWorkflowToWatch(makeListItem());
    expect(watch.id).toBe('test-watch');
    expect(watch.name).toBe('Test Watch');
    expect(watch.enabled).toBe(true);
    expect(watch.color).toBe('#6b7280');
    expect(watch.icon).toBe('email');
    expect(watch.autonomyLevel).toBe(1);
    expect(watch.schedule.mode).toBe('demand');
    expect(watch.scopes).toEqual([]);
    expect(watch.metrics.runs7d).toBeNull();
  });

  it('projects Deep Watch YAML with correct metadata', () => {
    const watch = projectWorkflowToWatch(
      makeListItem({
        id: 'system-security-watch-deep',
        name: 'Deep Watch',
        definition: WATCH_DEEP_YAML,
        managed: true,
        tags: ['watch'],
      })
    );
    expect(watch.managed).toBe(true);
    expect(watch.mandate).toBeTruthy();
    expect(watch.callables.length).toBeGreaterThanOrEqual(1);
  });

  it('respects ui.color, ui.icon, ui.order from policy', () => {
    const def = parseYaml(`
version: "1"
name: test
steps:
  - name: watch_policy
    type: data.set
    with:
      watch:
        mandate: Test
        ui:
          color: "#dc2626"
          icon: "search"
          order: 1
`);
    const watch = projectWorkflowToWatch(makeListItem({ definition: def }));
    expect(watch.color).toBe('#dc2626');
    expect(watch.icon).toBe('search');
    expect(watch.sortOrder).toBe(1);
  });

  it('falls back to definition.tags when item.tags is empty', () => {
    const def = parseYaml(`
version: "1"
name: test
tags:
  - watch
  - custom-tag
steps: []
`);
    const watch = projectWorkflowToWatch(makeListItem({ tags: [], definition: def }));
    expect(watch.tags).toContain('watch');
    expect(watch.tags).toContain('custom-tag');
  });
});

// ── projectRecentRunsFromHistory ──────────────────────────────────────────

describe('projectRecentRunsFromHistory', () => {
  it('returns empty array for undefined history', () => {
    expect(projectRecentRunsFromHistory(undefined)).toEqual([]);
  });

  it('returns empty array for empty history', () => {
    expect(projectRecentRunsFromHistory([])).toEqual([]);
  });

  it('maps history entries to recent runs', () => {
    const history = [
      { id: 'exec-1', startedAt: '2026-01-01T00:00:00Z', status: 'succeeded', duration: 45000 },
      { id: 'exec-2', startedAt: '2026-01-02T00:00:00Z', status: 'failed', duration: 12000 },
    ] as any;
    const runs = projectRecentRunsFromHistory(history);
    expect(runs).toHaveLength(2);
    expect(runs[0].executionId).toBe('exec-1');
    expect(runs[0].status).toBe('succeeded');
    expect(runs[0].summary).toContain('succeeded');
    expect(runs[0].summary).toContain('45s');
  });

  it('limits to 10 entries', () => {
    const history = Array.from({ length: 15 }, (_, i) => ({
      id: `exec-${i}`,
      startedAt: '2026-01-01T00:00:00Z',
      status: 'succeeded',
    })) as any;
    const runs = projectRecentRunsFromHistory(history);
    expect(runs).toHaveLength(10);
  });
});

// ── buildCustomWatchYaml ──────────────────────────────────────────────────

describe('buildCustomWatchYaml', () => {
  it('generates parseable YAML with correct structure', () => {
    const yamlStr = buildCustomWatchYaml('My Watch', 'A custom watch');
    const parsed = parseYaml(yamlStr);
    expect(parsed.name).toBe('My Watch');
    expect(parsed.description).toBe('A custom watch');
    expect(parsed.tags).toContain('watch');
    expect(parsed.tags).toContain('watch-custom');
    expect(parsed.steps).toHaveLength(2);
  });

  it('includes watch_policy step with correct defaults', () => {
    const yamlStr = buildCustomWatchYaml('Test', 'Desc');
    const parsed = parseYaml(yamlStr);
    const policyStep = parsed.steps!.find((s) => s.name === 'watch_policy');
    expect(policyStep).toBeDefined();
    expect(policyStep!.type).toBe('data.set');
  });

  it('escapes special characters in name', () => {
    const yamlStr = buildCustomWatchYaml('Watch "Alpha"', 'Desc');
    const parsed = parseYaml(yamlStr);
    expect(parsed.name).toBe('Watch "Alpha"');
  });
});
