/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { bindCoverageWorker, COVERAGE_WORKER_ID } from './worker_identity';

const accountId = 'kibana/alertzero_rule_coverage';
const workflowId = `${COVERAGE_WORKER_ID}-example`;
const stack = ({ enabled = false, account = false, runAs = accountId } = {}) => {
  let patched = false;
  const fetch = jest.fn(async (url: string, options: { method?: string } = {}) => {
    if (url === '/internal/alertzero/workers')
      return {
        workers: [
          {
            id: COVERAGE_WORKER_ID,
            enabled: patched || enabled,
            workflowId: patched ? workflowId : null,
            settingsRevision: 7,
            settings: patched || account ? { serviceAccountId: accountId } : {},
          },
        ],
      };
    if (url === `/internal/alertzero/workers/${COVERAGE_WORKER_ID}`) {
      patched = true;
      return {};
    }
    if (url === '/internal/security/service_account') {
      return options.method === 'POST' ? { id: accountId } : { serviceAccounts: [] };
    }
    if (url === `/api/workflows/workflow/${workflowId}`) {
      return { definition: { settings: { run_as: runAs } } };
    }
    return {};
  });
  return fetch;
};

describe('bindCoverageWorker', () => {
  it('creates its production role/account, PATCHes the worker and reads back run_as', async () => {
    const fetch = stack();
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).resolves.toEqual({
      workflowId,
      enabledByBind: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/security/role/alertzero_rule_coverage',
      expect.objectContaining({ method: 'PUT', query: { createOnly: true } })
    );
    const patch = fetch.mock.calls.find(
      ([url]) => url === `/internal/alertzero/workers/${COVERAGE_WORKER_ID}`
    );
    expect(JSON.parse((patch![1] as { body: string }).body)).toMatchObject({
      enabled: true,
      settingsRevision: 7,
      settings: { serviceAccountId: accountId, autonomy: 'assisted', scheduleInterval: '999d' },
    });
  });

  it('reuses an existing worker account and reports no bind tick for an enabled worker', async () => {
    const fetch = stack({ enabled: true, account: true });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).resolves.toEqual({
      workflowId,
      enabledByBind: false,
    });
    expect(fetch.mock.calls.some(([url]) => url === '/internal/security/service_account')).toBe(
      false
    );
  });

  it('rejects a workflow whose binding was not materialized', async () => {
    await expect(
      bindCoverageWorker(stack({ runAs: '' }) as unknown as HttpHandler)
    ).rejects.toThrow('settings.run_as');
  });
});
