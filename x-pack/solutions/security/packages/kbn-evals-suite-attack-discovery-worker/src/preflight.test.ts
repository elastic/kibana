/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  REVIEW_REQUIRED_STEP_IDS,
  RUNNER_REQUIRED_STEP_IDS,
} from './constants';
import { readFeatures, writeFeatures } from './inference_override';
import {
  assertNoLeftoverRouting,
  assertWorkflowInstalled,
  assertWorkflowsInstalled,
  parseStepNames,
  runPreflight,
} from './preflight';
import { enableFloorWorker, ensureFloorServiceAccount } from './floor_worker';
import { pauseEntityExtraction, prepareWorkerSpace } from './seed';

jest.mock('@kbn/evals', () => ({
  getInferenceEndpointId: (connector: { id: string }) => connector.id,
  inferenceEndpointExists: jest.fn(async () => true),
}));
jest.mock('./floor_worker', () => ({
  ensureFloorServiceAccount: jest.fn(),
  enableFloorWorker: jest.fn(),
}));
jest.mock('./seed', () => ({ prepareWorkerSpace: jest.fn(), pauseEntityExtraction: jest.fn() }));
jest.mock('./inference_override', () => ({
  ...jest.requireActual('./inference_override'),
  readFeatures: jest.fn(),
  writeFeatures: jest.fn(),
}));

const stepYaml = (names: readonly string[]): string =>
  `name: wf\nsteps:\n${names.map((name) => `  - name: ${name}\n    type: console`).join('\n')}\n`;

describe('parseStepNames', () => {
  it('collects top-level steps', () => {
    expect(parseStepNames(stepYaml(['a', 'b']))).toEqual(['a', 'b']);
  });

  it('collects steps nested in foreach, parallel, if/else and switch cases and default', () => {
    const yaml = `
name: wf
inputs:
  - name: not_a_step
    type: string
steps:
  - name: outer
    type: foreach
    steps:
      - name: inner_parallel
        type: parallel
        steps:
          - name: leaf
            type: console
  - name: branch
    type: if
    steps:
      - name: then_step
        type: console
    else:
      - name: else_step
        type: console
  - name: apply
    type: switch
    cases:
      - match: a
        steps:
          - name: case_step
            type: console
    default:
      - name: default_step
        type: console
`;
    expect(parseStepNames(yaml).sort()).toEqual(
      [
        'outer',
        'inner_parallel',
        'leaf',
        'branch',
        'then_step',
        'else_step',
        'apply',
        'case_step',
        'default_step',
      ].sort()
    );
  });

  it('is not fooled by "- name:" text in comments, block scalars or non-step keys', () => {
    const yaml = `
steps:
  - name: real
    type: console
    with:
      message: |
        - name: fake_in_block_scalar
  # - name: fake_in_comment
consts:
  - name: fake_outside_steps
`;
    expect(parseStepNames(yaml)).toEqual(['real']);
  });

  it('finds the step ids the suite requires in a nested definition', () => {
    const nested = [...RUNNER_REQUIRED_STEP_IDS, ...REVIEW_REQUIRED_STEP_IDS];
    const yaml = `steps:\n  - name: wrapper\n    type: foreach\n    steps:\n${nested
      .map((name) => `      - name: ${name}\n        type: console`)
      .join('\n')}\n`;
    expect(parseStepNames(yaml)).toEqual(expect.arrayContaining(nested));
  });
});

describe('assertWorkflowInstalled', () => {
  const fetchOf = (document: { yaml?: string; enabled?: boolean }) =>
    jest.fn().mockResolvedValue(document) as unknown as HttpHandler;

  it('fails when the workflow is installed but disabled', async () => {
    await expect(
      assertWorkflowInstalled({
        fetch: fetchOf({ yaml: stepYaml(['a']), enabled: false }),
        workflowId: 'wf',
        requiredStepIds: ['a'],
      })
    ).rejects.toThrow(/not enabled/);
  });

  it('fails when the document does not say it is enabled', async () => {
    await expect(
      assertWorkflowInstalled({
        fetch: fetchOf({ yaml: stepYaml(['a']) }),
        workflowId: 'wf',
        requiredStepIds: ['a'],
      })
    ).rejects.toThrow(/not enabled/);
  });

  it('passes an enabled workflow that declares the required steps', async () => {
    await expect(
      assertWorkflowInstalled({
        fetch: fetchOf({ yaml: stepYaml(['a']), enabled: true }),
        workflowId: 'wf',
        requiredStepIds: ['a'],
      })
    ).resolves.toBeUndefined();
  });

  it('checks the runner, the review and the analysis child', async () => {
    const fetch = jest.fn().mockResolvedValue({
      enabled: true,
      yaml: stepYaml([...RUNNER_REQUIRED_STEP_IDS, ...REVIEW_REQUIRED_STEP_IDS, 'analyze']),
    });
    await assertWorkflowsInstalled(fetch as unknown as HttpHandler);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe('assertNoLeftoverRouting', () => {
  const features = (endpoint: string) => [
    { feature_id: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID, endpoints: [{ id: endpoint }] },
  ];

  it('refuses a space that already routes AlertZero to the model under test', () => {
    expect(() =>
      assertNoLeftoverRouting({
        features: features('model-under-test'),
        models: ['model-under-test'],
      })
    ).toThrow(/already routes AlertZero inference/);
  });

  it('refuses a space that already routes AlertZero to the reference model', () => {
    expect(() =>
      assertNoLeftoverRouting({
        features: features('reference'),
        models: ['model-under-test', 'reference'],
      })
    ).toThrow(/reference/);
  });

  it('accepts a space routed to something else', () => {
    expect(() =>
      assertNoLeftoverRouting({ features: features('other'), models: ['model-under-test'] })
    ).not.toThrow();
  });
});

describe('runPreflight', () => {
  const log = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog;
  const connector = { id: 'model-under-test' } as unknown as EvalConnector;
  const original = [
    { feature_id: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID, endpoints: [{ id: 'baseline' }] },
  ];
  const restartExtraction = jest.fn();
  const restoreFloorWorker = jest.fn();
  const mockedFetch = jest.fn();

  const run = () =>
    runPreflight({
      fetch: mockedFetch as unknown as HttpHandler,
      esClient: {} as Client,
      log,
      connector,
      cohort: 'whole',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockResolvedValue({
      enabled: true,
      yaml: stepYaml([...RUNNER_REQUIRED_STEP_IDS, ...REVIEW_REQUIRED_STEP_IDS, 'analyze']),
    });
    (prepareWorkerSpace as jest.Mock).mockResolvedValue({ entityStoreStatus: 'running' });
    (pauseEntityExtraction as jest.Mock).mockResolvedValue(restartExtraction);
    (readFeatures as jest.Mock).mockResolvedValue(original);
    (writeFeatures as jest.Mock).mockResolvedValue(undefined);
    restartExtraction.mockResolvedValue(undefined);
    (ensureFloorServiceAccount as jest.Mock).mockResolvedValue('sa-1');
    (enableFloorWorker as jest.Mock).mockResolvedValue({
      workflowId: 'floor-wf',
      restore: restoreFloorWorker,
    });
    restoreFloorWorker.mockResolvedValue(undefined);
  });

  it('does not stop Entity Store extraction when a workflow is missing a required step', async () => {
    mockedFetch.mockResolvedValue({ enabled: true, yaml: stepYaml(['unrelated']) });
    await expect(run()).rejects.toThrow(/no longer declares step/);
    expect(pauseEntityExtraction).not.toHaveBeenCalled();
    expect(writeFeatures).not.toHaveBeenCalled();
  });

  it('does not stop Entity Store extraction when the space has leftover routing', async () => {
    (readFeatures as jest.Mock).mockResolvedValue([
      {
        feature_id: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
        endpoints: [{ id: 'model-under-test' }],
      },
    ]);
    await expect(run()).rejects.toThrow(/already routes AlertZero inference/);
    expect(pauseEntityExtraction).not.toHaveBeenCalled();
    expect(writeFeatures).not.toHaveBeenCalled();
  });

  it.each(['generation', 'review'] as const)(
    'rejects the unsupported %s cohort',
    async (cohort) => {
      await expect(
        runPreflight({
          fetch: mockedFetch as unknown as HttpHandler,
          esClient: {} as Client,
          log,
          connector,
          cohort,
          referenceModel: 'reference',
        })
      ).rejects.toThrow(/not supported/);
      expect(pauseEntityExtraction).not.toHaveBeenCalled();
    }
  );

  it('enables the floor worker after the routing is written and returns its workflow id', async () => {
    const result = await run();
    expect(result.floorWorkflowId).toBe('floor-wf');
    expect(enableFloorWorker).toHaveBeenCalledWith(
      expect.objectContaining({ serviceAccountId: 'sa-1' })
    );
    expect((writeFeatures as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (enableFloorWorker as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('restores extraction and the routing when the floor worker cannot be enabled', async () => {
    (enableFloorWorker as jest.Mock).mockRejectedValueOnce(new Error('blocked'));
    await expect(run()).rejects.toThrow('blocked');
    expect(restartExtraction).toHaveBeenCalledTimes(1);
    expect(writeFeatures).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), original);
  });

  it('disables the floor worker on restore, before the routing is written back', async () => {
    const { restore } = await run();
    (writeFeatures as jest.Mock).mockClear();
    await restore();
    expect(restoreFloorWorker).toHaveBeenCalledTimes(1);
    expect(restoreFloorWorker.mock.invocationCallOrder[0]).toBeLessThan(
      (writeFeatures as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('restores extraction and rethrows when writing the routing fails', async () => {
    (writeFeatures as jest.Mock).mockRejectedValueOnce(new Error('write failed'));
    await expect(run()).rejects.toThrow('write failed');
    expect(restartExtraction).toHaveBeenCalledTimes(1);
    // the original settings were written back by the partial restore
    expect(writeFeatures).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), original);
  });

  it('throws from restore when the routing cannot be written back, and still restarts extraction', async () => {
    const { restore } = await run();
    (writeFeatures as jest.Mock).mockRejectedValueOnce(new Error('settings write failed'));
    await expect(restore()).rejects.toThrow(/settings write failed/);
    expect(restartExtraction).toHaveBeenCalledTimes(1);
  });

  it('throws from restore when extraction cannot be restarted', async () => {
    const { restore } = await run();
    restartExtraction.mockRejectedValueOnce(new Error('start failed'));
    await expect(restore()).rejects.toThrow(/start failed/);
  });

  it('restores cleanly when nothing fails', async () => {
    const { restore } = await run();
    await expect(restore()).resolves.toBeUndefined();
  });
});
