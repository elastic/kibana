/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  WATCH_FLOOR_TAG,
} from '@kbn/alertzero-common';
import { OTHER_WATCH_TAG, OTHER_WORKER_ID } from '../constants';
import type { AlertZeroEnvelope } from '../event_types';
import type { AlertZeroEnvelopeRoot } from './build_alertzero_envelope';
import { buildAlertZeroEnvelope } from './build_alertzero_envelope';

const ROOT_EXECUTION_ID = '0b6a1f4e-8c43-4a39-9a4e-1f7f5f3f9c10';
const REVIEW_EXECUTION_ID = 'c5d0e2a9-3b7e-4c61-8f2d-6a9b0e4d7f21';

const defaultRoot: AlertZeroEnvelopeRoot = {
  context: {},
  id: ROOT_EXECUTION_ID,
  originManagedWorkflowId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  spaceId: DEFAULT_SPACE_ID,
  triggeredBy: 'scheduled',
  workflowDefinition: {
    consts: { worker_settings: { autonomy: 'supervised', scheduleInterval: '24h' } },
  },
};

const build = (root: AlertZeroEnvelopeRoot = defaultRoot): AlertZeroEnvelope =>
  buildAlertZeroEnvelope({ executionId: REVIEW_EXECUTION_ID, root });

describe('buildAlertZeroEnvelope', () => {
  it('builds the full envelope for a scheduled catalog Worker run in the default space', () => {
    expect(build()).toEqual({
      autonomy_level: 'supervised',
      autonomy_mode: 'auto_accept',
      execution_id: REVIEW_EXECUTION_ID,
      is_default_space: true,
      run_id: ROOT_EXECUTION_ID,
      trigger_type: 'scheduled',
      watch_tag: WATCH_FLOOR_TAG,
      worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    });
  });

  it.each<{
    expected: AlertZeroEnvelope[keyof AlertZeroEnvelope];
    field: keyof AlertZeroEnvelope;
    overrides: Partial<AlertZeroEnvelopeRoot>;
    title: string;
  }>([
    {
      expected: ROOT_EXECUTION_ID,
      field: 'run_id',
      overrides: {},
      title: 'uses the root execution id as `run_id`',
    },
    {
      expected: REVIEW_EXECUTION_ID,
      field: 'execution_id',
      overrides: {},
      title: 'uses the reporting execution id as `execution_id`',
    },
    {
      expected: false,
      field: 'is_default_space',
      overrides: { spaceId: 'security-team' },
      title: 'reports `is_default_space: false` for a root in another space',
    },
    {
      expected: OTHER_WORKER_ID,
      field: 'worker_id',
      overrides: { originManagedWorkflowId: null },
      title: 'falls back to `other` for an unmanaged root',
    },
    {
      expected: 'manual',
      field: 'trigger_type',
      overrides: { triggeredBy: 'manual' },
      title: 'reads trigger_type from the root, not from the reporting execution',
    },
  ])('$title', ({ expected, field, overrides }) => {
    expect(build({ ...defaultRoot, ...overrides })[field]).toBe(expected);
  });

  it('never ships the space id', () => {
    const result = build({ ...defaultRoot, spaceId: 'security-team' });

    expect(JSON.stringify(result)).not.toContain('security-team');
  });

  it.each<{
    expected: Partial<AlertZeroEnvelope>;
    overrides: Partial<AlertZeroEnvelopeRoot>;
    title: string;
  }>([
    {
      expected: { watch_tag: OTHER_WATCH_TAG, worker_id: OTHER_WORKER_ID },
      overrides: { originManagedWorkflowId: 'my-custom-workflow' },
      title: 'falls back to `other` for a root outside the Worker catalog',
    },
    {
      expected: { autonomy_level: 'supervised', autonomy_mode: 'auto_accept' },
      overrides: { triggeredBy: 'manual' },
      title:
        'keeps the configured autonomy for a manual run of a Worker whose autonomy ignores the trigger',
    },
  ])('$title', ({ expected, overrides }) => {
    expect(build({ ...defaultRoot, ...overrides })).toEqual(expect.objectContaining(expected));
  });

  it.each([
    ['manual', 'gated'],
    ['assisted', 'gated'],
    ['supervised', 'auto_accept'],
  ] as const)('derives autonomy_mode for %s as %s', (autonomy, expectedMode) => {
    const result = build({
      ...defaultRoot,
      workflowDefinition: { consts: { worker_settings: { autonomy } } },
    });

    expect(result).toEqual(
      expect.objectContaining({ autonomy_level: autonomy, autonomy_mode: expectedMode })
    );
  });

  it.each<[keyof AlertZeroEnvelope, AlertZeroEnvelopeRoot['workflowDefinition']]>([
    ['autonomy_level', { consts: {} }],
    ['autonomy_mode', null],
  ])(
    'omits %s when the root definition carries no recognised level',
    (property, workflowDefinition) => {
      expect(build({ ...defaultRoot, workflowDefinition })).not.toHaveProperty(property);
    }
  );

  describe('a Worker that acts at its configured autonomy only when scheduled', () => {
    const endpointAnalysisRoot: AlertZeroEnvelopeRoot = {
      ...defaultRoot,
      originManagedWorkflowId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
    };

    it('reports the configured autonomy for a scheduled run', () => {
      expect(build(endpointAnalysisRoot)).toEqual(
        expect.objectContaining({ autonomy_level: 'supervised', autonomy_mode: 'auto_accept' })
      );
    });

    it.each([['manual'], ['workflow-step'], ['evals-run-now'], [undefined]])(
      'omits autonomy_level and autonomy_mode for a run triggered by %p',
      (triggeredBy) => {
        const result = build({ ...endpointAnalysisRoot, triggeredBy });

        expect({
          hasAutonomyLevel: 'autonomy_level' in result,
          hasAutonomyMode: 'autonomy_mode' in result,
        }).toEqual({ hasAutonomyLevel: false, hasAutonomyMode: false });
      }
    );

    it('keeps the rest of the envelope for a manual run', () => {
      expect(build({ ...endpointAnalysisRoot, triggeredBy: 'manual' })).toEqual({
        execution_id: REVIEW_EXECUTION_ID,
        is_default_space: true,
        run_id: ROOT_EXECUTION_ID,
        trigger_type: 'manual',
        watch_tag: 'watch-forensics',
        worker_id: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
      });
    });
  });

  it('accepts a root with no persisted definition or context', () => {
    expect(build({ id: ROOT_EXECUTION_ID, spaceId: DEFAULT_SPACE_ID })).toEqual({
      execution_id: REVIEW_EXECUTION_ID,
      is_default_space: true,
      run_id: ROOT_EXECUTION_ID,
      trigger_type: 'unknown',
      watch_tag: OTHER_WATCH_TAG,
      worker_id: OTHER_WORKER_ID,
    });
  });
});
