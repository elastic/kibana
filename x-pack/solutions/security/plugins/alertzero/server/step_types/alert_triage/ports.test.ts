/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tagAlerts } from './ports';

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
