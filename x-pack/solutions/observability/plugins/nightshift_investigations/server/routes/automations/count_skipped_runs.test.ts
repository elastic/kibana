/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getSkippedRunIds } from './count_skipped_runs';
import { SKIP_REASONS } from './map_run_status';

const [skipReason] = SKIP_REASONS;

describe('getSkippedRunIds', () => {
  it('walks all pages via searchAfter and dedupes run ids', async () => {
    const searchStepExecutions = jest
      .fn()
      .mockResolvedValueOnce({
        results: [
          { workflowRunId: 'run-1', output: { skip_reason: skipReason } },
          { workflowRunId: 'run-2', output: {} },
        ],
        total: 3,
        searchAfter: [1, 'step-2'],
      })
      .mockResolvedValueOnce({
        results: [{ workflowRunId: 'run-1', output: { skip_reason: skipReason } }],
        total: 3,
      });

    const ids = await getSkippedRunIds({
      management: { searchStepExecutions },
      workflowId: 'wf-1',
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
    });

    expect(ids).toEqual(['run-1']);
    expect(searchStepExecutions).toHaveBeenCalledTimes(2);
    expect(searchStepExecutions.mock.calls[0][0].searchAfter).toBeUndefined();
    expect(searchStepExecutions.mock.calls[1][0].searchAfter).toEqual([1, 'step-2']);
    expect(searchStepExecutions.mock.calls[1][0]).not.toHaveProperty('page');
  });
});
