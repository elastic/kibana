/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listLiveExecutionIds, tagAlerts } from './ports';

const tagWith = (body: Record<string, unknown>) => {
  const callKibanaApi = jest.fn().mockResolvedValue({ status: 200, headers: {}, body });
  const tag = tagAlerts({ callKibanaApi });
  return {
    callKibanaApi,
    run: () => tag({ alertIds: ['a1', 'a2'], add: ['az:triage_pending'], remove: [] }),
  };
};

describe('tagAlerts', () => {
  it('sends the ids and tag changes to the detection-engine tags route', async () => {
    const { run, callKibanaApi } = tagWith({ updated: 2, timed_out: false, failures: [] });

    await run();

    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/detection_engine/signals/tags',
      body: { ids: ['a1', 'a2'], tags: { tags_to_add: ['az:triage_pending'], tags_to_remove: [] } },
    });
  });

  it('resolves when the update was applied in full', async () => {
    await expect(tagWith({ updated: 2, timed_out: false, failures: [] }).run()).resolves.toBe(
      undefined
    );
  });

  it('rejects a 200 whose update timed out, so an unstored claim is not reported as made', async () => {
    await expect(tagWith({ updated: 1, timed_out: true, failures: [] }).run()).rejects.toThrow(
      'not fully applied'
    );
  });

  it('rejects a 200 that carries failures, so an unstored release is not reported as made', async () => {
    await expect(
      tagWith({ updated: 1, timed_out: false, failures: [{ cause: { type: 'x' } }] }).run()
    ).rejects.toThrow('not fully applied');
  });
});

describe('listLiveExecutionIds', () => {
  it('lists the live execution ids of the batch workflow', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: { results: [{ id: 'e1' }, { id: 'e2' }] },
    });

    await expect(listLiveExecutionIds({ callKibanaApi }, 'batch')).resolves.toEqual(
      new Set(['e1', 'e2'])
    );
  });

  // The sweep treats an unreadable list as "unknown" and starts nothing, so a permission failure
  // would otherwise be indistinguishable from a transient one.
  it('logs why the live executions could not be read and reports them unknown', async () => {
    const callKibanaApi = jest.fn().mockRejectedValue(new Error('HTTP 403: Forbidden'));
    const logger = { warn: jest.fn() };

    await expect(listLiveExecutionIds({ callKibanaApi }, 'batch', logger)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 403: Forbidden'));
  });
});
