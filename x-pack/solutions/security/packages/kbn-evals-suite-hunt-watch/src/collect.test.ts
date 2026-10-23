/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { JsonObject } from '@kbn/utility-types';
import { readCoordinatorResult } from './collect';
import { READ_HUNT_RESULT_STEP_ID, RUN_HUNT_COORDINATOR_STEP_ID } from './constants';

const huntChildYaml = readFileSync(
  Path.join(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt.yaml'
  ),
  'utf8'
);

describe('hunt child step ids', () => {
  it.each([RUN_HUNT_COORDINATOR_STEP_ID, READ_HUNT_RESULT_STEP_ID])(
    'returns a step named %s in the managed hunt child yaml',
    (stepId) => {
      expect(huntChildYaml).toContain(`- name: ${stepId}`);
    }
  );
});

describe('readCoordinatorResult', () => {
  const completedRead = (result: JsonObject) => ({
    stepId: READ_HUNT_RESULT_STEP_ID,
    output: { data: { state: 'completed', result } },
  });
  const runningRead = { stepId: READ_HUNT_RESULT_STEP_ID, output: { data: { state: 'running' } } };
  const startEnvelope = {
    stepId: RUN_HUNT_COORDINATOR_STEP_ID,
    output: { run_id: 'r', state: 'running', result_attachment_id: 'a' },
  };

  it('returns the result from the completed poll read', () => {
    expect(
      readCoordinatorResult([
        startEnvelope,
        runningRead,
        completedRead({ completeness: 'complete' }),
      ])
    ).toEqual({ completeness: 'complete' });
  });

  it('returns undefined when no read completed', () => {
    expect(readCoordinatorResult([startEnvelope, runningRead, runningRead])).toBeUndefined();
  });

  it('returns undefined for a failed envelope', () => {
    expect(
      readCoordinatorResult([
        startEnvelope,
        { stepId: READ_HUNT_RESULT_STEP_ID, output: { data: { state: 'failed', error: {} } } },
      ])
    ).toBeUndefined();
  });

  it('returns the result without Tier 1 sample hits', () => {
    expect(
      readCoordinatorResult([
        completedRead({ tier1: { status: 'no_environment_hits', hits: [1] } }),
      ])
    ).toEqual({ tier1: { status: 'no_environment_hits' } });
  });
});
