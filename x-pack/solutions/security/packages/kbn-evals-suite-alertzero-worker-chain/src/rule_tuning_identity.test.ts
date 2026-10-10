/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import { withRuleTuningIdentity } from './rule_tuning_identity';

const setup = (username = 'namespace/worker') => {
  const fetch = jest.fn().mockResolvedValue({ username });
  const security = {
    createServiceToken: jest.fn().mockResolvedValue({ token: { value: 'disposable-test-token' } }),
    deleteServiceToken: jest.fn().mockResolvedValue({}),
  };
  const run = jest.fn(async (worker) => {
    await worker.fetch('/review', { method: 'POST', headers: { 'kbn-xsrf': 'true' } });
    return 'record';
  });
  return {
    fetch,
    security,
    run,
    input: {
      operator: { fetch: fetch as unknown as HttpHandler, spaceId: 'default' },
      esClient: { security } as unknown as EsClient,
      serviceAccountId: 'namespace/worker',
      run,
    },
  };
};

it('authenticates worker requests and revokes the disposable credential', async () => {
  const { input, fetch, security, run } = setup();
  await expect(withRuleTuningIdentity(input)).resolves.toBe('record');
  expect(fetch).toHaveBeenCalledWith(
    expect.objectContaining({
      path: '/internal/security/me',
      headers: { Authorization: 'Bearer disposable-test-token' },
    })
  );
  expect(fetch).toHaveBeenCalledWith(
    expect.objectContaining({
      path: '/review',
      method: 'POST',
      headers: { Authorization: 'Bearer disposable-test-token', 'kbn-xsrf': 'true' },
    })
  );
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({ spaceId: 'default' }),
    'namespace/worker'
  );
  expect(security.deleteServiceToken).toHaveBeenCalledWith(
    security.createServiceToken.mock.calls[0][0]
  );
});

it('refuses an operator identity and still revokes the credential', async () => {
  const { input, security, run } = setup('operator');
  await expect(withRuleTuningIdentity(input)).rejects.toThrow('did not authenticate');
  expect(run).not.toHaveBeenCalled();
  expect(security.deleteServiceToken).toHaveBeenCalledTimes(1);
});

it('revokes the credential when the review fails', async () => {
  const { input, security, run } = setup();
  run.mockRejectedValue(new Error('review failed'));
  await expect(withRuleTuningIdentity(input)).rejects.toThrow('review failed');
  expect(security.deleteServiceToken).toHaveBeenCalledTimes(1);
});

it('rejects unsupported account ids before minting a credential', async () => {
  const { input, security } = setup();
  await expect(
    withRuleTuningIdentity({ ...input, serviceAccountId: 'not-a-principal' })
  ).rejects.toThrow('Elasticsearch service account');
  expect(security.createServiceToken).not.toHaveBeenCalled();
});
