/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/kbn-client';
import { ToolingLog } from '@kbn/tooling-log';
import {
  MAX_LIST_EXPERIMENTS,
  MatrixEvalsClient,
  createEvaluationsKbnClient,
} from './matrix_evals_client';

const log = new ToolingLog();

const clientReturning = (data: unknown) => {
  const request = jest.fn().mockResolvedValue({ data, status: 200 });
  return { kbnClient: { request } as unknown as KbnClient, request };
};

const experiment = (id: string, gitBranch: string) => ({
  experiment_id: id,
  timestamp: '2026-09-01T00:00:00.000Z',
  git_branch: gitBranch,
});

describe('MatrixEvalsClient', () => {
  it('lists experiments with a clamped page size and keeps only the requested branch', async () => {
    const { kbnClient, request } = clientReturning({
      experiments: [experiment('a', 'main'), experiment('b', 'feature')],
      total: 2,
    });

    const experiments = await new MatrixEvalsClient(kbnClient, log).listExperiments({
      suiteId: 'suite',
      taskModelId: 'model',
      branch: 'main',
      limit: 500,
    });

    expect(experiments.map(({ experiment_id: experimentId }) => experimentId)).toEqual(['a']);
    expect(request.mock.calls[0][0].query).toEqual({
      suite_id: 'suite',
      model_id: 'model',
      branch: 'main',
      page: 1,
      per_page: MAX_LIST_EXPERIMENTS,
    });
  });

  it('sends example score filters and returns an empty list when the request fails', async () => {
    const request = jest.fn().mockRejectedValue(new Error('boom'));
    const client = new MatrixEvalsClient({ request } as unknown as KbnClient, log);

    await expect(
      client.getExampleScores('example 1', { executionId: 'exec', modelId: 'model' })
    ).resolves.toEqual([]);
    expect(request.mock.calls[0][0]).toMatchObject({
      path: expect.stringContaining('example%201'),
      query: { execution_id: 'exec', model_id: 'model' },
    });
  });
});

describe('createEvaluationsKbnClient', () => {
  it('adds the API key header without dropping caller headers', async () => {
    const baseRequest = jest
      .spyOn(KbnClient.prototype, 'request')
      .mockResolvedValue({ data: {}, status: 200 } as never);

    const kbnClient = createEvaluationsKbnClient({
      log,
      url: 'http://localhost:5601',
      apiKey: 'k',
    });
    await kbnClient.request({ path: '/x', method: 'GET', headers: { 'x-custom': '1' } });

    expect(baseRequest).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'ApiKey k', 'x-custom': '1' } })
    );
    baseRequest.mockRestore();
  });
});
