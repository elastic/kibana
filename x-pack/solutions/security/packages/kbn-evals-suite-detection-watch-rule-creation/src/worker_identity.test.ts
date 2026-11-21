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
const stack = ({
  enabled = false,
  account = false,
  runAs = accountId,
  flavor = 'traditional',
  role = (name: string): unknown => ({ metadata: { _reserved: true }, name }),
}: {
  enabled?: boolean;
  account?: boolean;
  runAs?: string;
  flavor?: string;
  role?: (name: string) => unknown;
} = {}) => {
  let patched = false;
  const fetch = jest.fn(async (url: string, options: { method?: string } = {}) => {
    if (url === '/api/status') return { version: { build_flavor: flavor } };
    if (url.startsWith('/api/security/role/')) {
      return role(decodeURIComponent(url.slice('/api/security/role/'.length)));
    }
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

const roleCalls = (fetch: jest.Mock) =>
  fetch.mock.calls.filter(([url]) => String(url).startsWith('/api/security/role/'));

const accountPost = (fetch: jest.Mock) => {
  const call = fetch.mock.calls.find(
    ([url, options]) => url === '/internal/security/service_account' && options?.method === 'POST'
  );
  return JSON.parse((call![1] as { body: string }).body);
};

describe('bindCoverageWorker', () => {
  it('binds the built-in role to the account, PATCHes the worker and reads back run_as', async () => {
    const fetch = stack();
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).resolves.toEqual({
      workflowId,
      enabledByBind: true,
    });
    expect(roleCalls(fetch).map(([url, options]) => [url, options.method])).toEqual([
      ['/api/security/role/alertzero_rule_coverage', 'GET'],
    ]);
    expect(accountPost(fetch)).toMatchObject({
      name: 'alertzero_rule_coverage',
      roles: ['alertzero_rule_coverage'],
    });
    const patch = fetch.mock.calls.find(
      ([url]) => url === `/internal/alertzero/workers/${COVERAGE_WORKER_ID}`
    );
    expect(JSON.parse((patch![1] as { body: string }).body)).toMatchObject({
      enabled: true,
      settingsRevision: 7,
      settings: { serviceAccountId: accountId, autonomy: 'assisted', scheduleInterval: '999d' },
    });
  });

  it('uses the _-prefixed predefined role on Serverless', async () => {
    const fetch = stack({ flavor: 'serverless' });
    await bindCoverageWorker(fetch as unknown as HttpHandler);
    expect(roleCalls(fetch).map(([url, options]) => [url, options.method])).toEqual([
      ['/api/security/role/_alertzero_rule_coverage', 'GET'],
    ]);
    expect(accountPost(fetch)).toMatchObject({
      name: 'alertzero_rule_coverage',
      roles: ['_alertzero_rule_coverage'],
    });
  });

  it('never writes a role, even when the built-in role is missing', async () => {
    const fetch = stack({
      role: () => {
        throw Object.assign(new Error('Not Found'), { response: { status: 404 } });
      },
    });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).rejects.toThrow(
      'role alertzero_rule_coverage is missing'
    );
    expect(roleCalls(fetch).every(([, options]) => options.method === 'GET')).toBe(true);
    expect(accountPost.bind(null, fetch)).toThrow();
  });

  it('fails naming the Serverless role when it is missing', async () => {
    const fetch = stack({
      flavor: 'serverless',
      role: () => {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      },
    });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).rejects.toThrow(
      'predefined role _alertzero_rule_coverage is missing'
    );
  });

  it('rejects a role that is not reserved, so a custom same-named role is never trusted', async () => {
    const fetch = stack({ role: () => ({ metadata: {} }) });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).rejects.toThrow(
      'role alertzero_rule_coverage is missing'
    );
    expect(accountPost.bind(null, fetch)).toThrow();
  });

  it('rethrows non-404 role lookup errors unchanged', async () => {
    const boom = Object.assign(new Error('boom'), { response: { status: 500 } });
    const fetch = stack({
      role: () => {
        throw boom;
      },
    });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).rejects.toBe(boom);
  });

  it('reuses an existing worker account and reports no bind tick for an enabled worker', async () => {
    const fetch = stack({ enabled: true, account: true });
    await expect(bindCoverageWorker(fetch as unknown as HttpHandler)).resolves.toEqual({
      workflowId,
      enabledByBind: false,
    });
    expect(roleCalls(fetch)).toEqual([]);
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
