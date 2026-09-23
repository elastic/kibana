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

  it('pages past the first page of experiments when the listing is larger than one page', async () => {
    // Regression: a fixed `page: 1` truncated discovery at 100 experiments per suite/model.
    const page = (n: number) => ({
      experiments: Array.from({ length: MAX_LIST_EXPERIMENTS }, (_, i) => ({
        ...experiment(`p${n}-${i}`, 'main'),
      })),
      total: MAX_LIST_EXPERIMENTS * 2,
    });
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: page(1), status: 200 })
      .mockResolvedValueOnce({
        data: { experiments: [experiment('last', 'main')], total: MAX_LIST_EXPERIMENTS * 2 },
        status: 200,
      });

    const experiments = await new MatrixEvalsClient(
      { request } as unknown as KbnClient,
      log
    ).listExperiments({ suiteId: 'suite', branch: 'main', limit: MAX_LIST_EXPERIMENTS * 2 });

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].query.page).toBe(2);
    expect(experiments).toHaveLength(MAX_LIST_EXPERIMENTS + 1);
    expect(experiments[experiments.length - 1].experiment_id).toBe('last');
  });

  it('stops paging when the server returns fewer rows than requested', async () => {
    const request = jest.fn().mockResolvedValue({
      data: { experiments: [experiment('only', 'main')], total: 1 },
      status: 200,
    });

    const experiments = await new MatrixEvalsClient(
      { request } as unknown as KbnClient,
      log
    ).listExperiments({ suiteId: 'suite' });

    expect(request).toHaveBeenCalledTimes(1);
    expect(experiments.map(({ experiment_id: id }) => id)).toEqual(['only']);
  });

  it('sends example score filters and rethrows request failures so bounded retry can engage', async () => {
    const request = jest.fn().mockRejectedValue(new Error('boom'));
    const client = new MatrixEvalsClient({ request } as unknown as KbnClient, log);

    await expect(
      client.getExampleScores('example 1', { executionId: 'exec', modelId: 'model' })
    ).rejects.toThrow('boom');
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
