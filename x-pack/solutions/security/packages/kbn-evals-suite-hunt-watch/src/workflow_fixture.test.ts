/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import {
  HUNT_EXECUTE_WORKFLOW_ID,
  HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  HUNT_WORKER_WORKFLOW_ID,
} from './constants';
import { assertWorkflowInstalled } from './workflow_fixture';

const GLOBAL_CHILD_IDS = [
  HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  HUNT_EXECUTE_WORKFLOW_ID,
  HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  HUNT_PROPOSAL_GATE_WORKFLOW_ID,
];

const HEALTHY_WORKER_YAML = [
  'steps:',
  '  - name: check_index_scope',
  '  - name: resolve_index_scope_gate',
  '  - name: select_candidate_reports',
  '  - name: report_fan_out',
  '    steps:',
  '      - name: find_or_create_investigation',
  '      - name: hunt',
  '      - name: package_report',
  '      - name: resolve_run_outcome',
  '      - name: write_run_conclusion',
].join('\n');

interface MockOptions {
  /** Global child workflow ids that 404 instead of resolving. */
  missingChildIds?: string[];
  /** Per-space worker catalog overrides, keyed by spaceId. */
  workerOverrides?: Record<
    string,
    Partial<{ enabled: boolean; state: string; workflowId: string }>
  >;
  /** Replaces the worker yaml document returned for every space. */
  workerYaml?: string;
  /** Spaces for which the workers list route itself 404s. */
  unreachableWorkersSpaces?: string[];
}

const expectedWorkerWorkflowId = (spaceId: string) => `${HUNT_WORKER_WORKFLOW_ID}-${spaceId}`;

const buildMockFetch = (options: MockOptions = {}): HttpHandler => {
  const {
    missingChildIds = [],
    workerOverrides = {},
    workerYaml = HEALTHY_WORKER_YAML,
    unreachableWorkersSpaces = [],
  } = options;

  return jest.fn(async (path: string) => {
    const workflowMatch = /\/api\/workflows\/workflow\/([^/]+)$/.exec(path);
    if (workflowMatch) {
      const workflowId = decodeURIComponent(workflowMatch[1]);
      if (missingChildIds.includes(workflowId)) {
        const error = new Error('Not Found') as Error & { status?: number };
        error.status = 404;
        throw error;
      }
      return { yaml: workerYaml };
    }

    const workersMatch = /^\/s\/([^/]+)\/internal\/alertzero\/workers$/.exec(path);
    if (workersMatch) {
      const spaceId = decodeURIComponent(workersMatch[1]);
      if (unreachableWorkersSpaces.includes(spaceId)) {
        throw new Error('ECONNREFUSED');
      }
      const override = workerOverrides[spaceId] ?? {};
      return {
        workers: [
          {
            id: 'system-security-hunt-continuous-threat-hunt',
            enabled: override.enabled ?? true,
            state: override.state ?? 'ok',
            workflowId: override.workflowId ?? expectedWorkerWorkflowId(spaceId),
          },
        ],
      };
    }

    throw new Error(`Unexpected fetch call: ${path}`);
  }) as unknown as HttpHandler;
};

const run = (fetch: HttpHandler, spaceIds: string[] = ['default']) =>
  assertWorkflowInstalled({ fetch, log: new ToolingLog(), spaceIds });

describe('assertWorkflowInstalled', () => {
  it('resolves when every global child and the per-space Worker are healthy', async () => {
    await expect(run(buildMockFetch(), ['default', 'hunt-a'])).resolves.toBeUndefined();
  });

  it.each(GLOBAL_CHILD_IDS)('throws naming the missing global child "%s"', async (missingId) => {
    await expect(run(buildMockFetch({ missingChildIds: [missingId] }))).rejects.toThrow(
      new RegExp(missingId)
    );
  });

  it('throws naming the space when the Worker is not enabled', async () => {
    await expect(
      run(buildMockFetch({ workerOverrides: { default: { enabled: false } } }))
    ).rejects.toThrow(/enabled=false/);
  });

  it('throws naming the space when the Worker state is not "ok"', async () => {
    await expect(
      run(buildMockFetch({ workerOverrides: { default: { state: 'paused' } } }))
    ).rejects.toThrow(/state=paused/);
  });

  it('throws when the per-space workflowId does not match the templated scheme', async () => {
    await expect(
      run(buildMockFetch({ workerOverrides: { default: { workflowId: 'wrong-id' } } }))
    ).rejects.toThrow(/reports workflowId "wrong-id"/);
  });

  it('throws naming every missing step id when the Worker yaml drifts', async () => {
    await expect(
      run(buildMockFetch({ workerYaml: 'steps:\n  - name: check_index_scope\n' }))
    ).rejects.toThrow(/resolve_index_scope_gate/);
  });

  it('throws naming the space when the workers route is unreachable', async () => {
    await expect(run(buildMockFetch({ unreachableWorkersSpaces: ['default'] }))).rejects.toThrow(
      /not reachable/
    );
  });
});
