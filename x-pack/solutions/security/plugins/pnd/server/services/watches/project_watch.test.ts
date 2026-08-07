/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowYaml } from '@kbn/workflows';
import {
  extractWatchPolicy,
  normalizeWorkflowTriggerType,
  projectCallablesFromDefinition,
  projectSchedule,
  projectWorkflowToWatch,
} from './project_watch';

describe('project watch', () => {
  describe('extractWatchPolicy', () => {
    it('reads static policy from consts.watch_policy', () => {
      const definition = {
        version: '1',
        name: 'Deep Watch',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: {
          watch_policy: {
            mandate: 'Deep investigation & hunts',
            autonomyLevel: 'assisted',
            handoff: 'records',
            ui: { color: '#8b5cf6', icon: 'console', order: 40 },
          },
        },
        steps: [{ name: 'stub', type: 'console', with: { message: 'hi' } }],
      } as unknown as WorkflowYaml;

      expect(extractWatchPolicy(definition)).toMatchObject({
        mandate: 'Deep investigation & hunts',
        autonomyLevel: 'assisted',
        handoff: 'records',
        ui: { color: '#8b5cf6', icon: 'console', order: 40 },
      });
    });
  });

  it('projects three-level autonomy and the real scheduled interval', () => {
    const watch = projectWorkflowToWatch({
      id: 'security-watch-dark',
      name: 'Dark Watch',
      description: 'Hunts',
      enabled: true,
      managed: false,
      createdAt: '2026-08-06T00:00:00.000Z',
      valid: true,
      definition: {
        version: '1',
        name: 'Dark Watch',
        enabled: true,
        tags: ['watch'],
        triggers: [{ type: 'scheduled', with: { every: '6h' } }],
        consts: { watch_policy: { autonomyLevel: 'supervised' } },
        steps: [],
      },
    } as never);

    expect(watch).toMatchObject({
      autonomyLevel: 'supervised',
      scheduleInterval: '6h',
    });
  });

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

  describe('projectSchedule', () => {
    it('uses actual manual-only triggers instead of an incompatible policy mode', () => {
      expect(
        projectSchedule([{ type: 'manual', summary: 'Manual / on demand' }], {
          mode: 'always',
          cadence: 'stream',
          onDemand: false,
        })
      ).toMatchObject({ mode: 'demand', cadence: 'manual', set: false, onDemand: true });
    });

    it('preserves a configured window for scheduled watches', () => {
      expect(
        projectSchedule([{ type: 'schedule', summary: 'Scheduled' }], {
          mode: 'window',
          from: 22,
          to: 6,
        })
      ).toMatchObject({ mode: 'window', set: true, from: 22, to: 6 });
    });

    it('derives display minutes from the authoritative workflow interval', () => {
      expect(
        projectSchedule([{ type: 'schedule', summary: 'Scheduled' }], { mode: 'always' }, '90s')
      ).toMatchObject({ every: 2 });
    });
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
