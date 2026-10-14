/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { ALERTZERO_ENABLED_SETTING_ID, ALERT_ANALYSIS_SETTINGS_URL, WORKER_IDS } from './constants';
import {
  createHarnessState,
  setupWorkerChainHarness,
  teardownWorkerChainHarness,
} from './harness_setup';

const SETTING_URL = '/internal/kibana/settings';
const WORKERS_URL = '/internal/alertzero/workers';
const SA_URL = '/internal/security/service_account';

interface Account {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

interface FakeWorker {
  id: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings: { serviceAccountId?: string; autonomy?: string };
  workflowId: string | null;
}

interface FakeOptions {
  method?: string;
  body?: string;
}

interface Opts {
  priorSetting?: unknown;
  /** Workers install on enable (the product behaviour); false simulates a failed install. */
  installOnEnable?: boolean;
  existingAccounts?: Account[];
  /** Whether the space's alert-analysis workflow is already on (default: off, as on a fresh stack). */
  priorAnalysis?: boolean;
  /** `/api/status` build flavor. */
  flavor?: 'traditional' | 'serverless';
  /** Answers GET /api/security/role/<name>. Default: every role exists and is reserved. */
  role?: (name: string) => unknown;
}

/** A tiny in-memory Kibana: the setting gates the Workers routes exactly like the product. */
const makeStack = ({
  priorSetting,
  installOnEnable = true,
  existingAccounts = [],
  priorAnalysis = false,
  flavor = 'traditional',
  role = () => ({ metadata: { _reserved: true } }),
}: Opts = {}) => {
  const calls: string[] = [];
  let setting: unknown = priorSetting;
  let analysis = priorAnalysis;
  const accounts = [...existingAccounts];
  const workers: Record<string, FakeWorker> = Object.fromEntries(
    Object.values(WORKER_IDS).map((id) => [
      id,
      { id, enabled: false, settingsRevision: null, settings: {}, workflowId: null },
    ])
  );
  const notFound = () => Object.assign(new Error('Not Found'), { status: 404 });

  const fetch = jest.fn(async (path: string, options: FakeOptions = {}) => {
    const method = options.method ?? 'GET';
    calls.push(`${method} ${path}`);
    if (path === SETTING_URL) {
      if (method === 'POST') {
        const next = JSON.parse(options.body ?? '{}').changes[ALERTZERO_ENABLED_SETTING_ID];
        setting = next === null ? undefined : next;
        return { settings: {} };
      }
      return {
        settings:
          setting === undefined ? {} : { [ALERTZERO_ENABLED_SETTING_ID]: { userValue: setting } },
      };
    }
    if (path === ALERT_ANALYSIS_SETTINGS_URL) {
      if (method === 'PUT') analysis = JSON.parse(options.body ?? '{}').workflowEnabled;
      return { settings: { workflowEnabled: analysis, tagPrefix: 'alert-analysis' } };
    }
    if (path.startsWith(WORKERS_URL)) {
      if (setting !== true) throw notFound();
      if (method === 'GET') {
        // F6: a single-Worker read-back (teardown diff) answers with that worker.
        // The product's GET parses stored template values through toSettings(),
        // which fills declaration defaults for missing autonomy — mirror that so
        // a worker whose settings were never written still reports an autonomy.
        const readOne = (w: FakeWorker) => ({
          ...w,
          settings: { autonomy: w.settings.autonomy ?? 'manual', ...w.settings },
        });
        if (path.length > WORKERS_URL.length + 1) {
          const one = workers[decodeURIComponent(path.slice(WORKERS_URL.length + 1))];
          if (one === undefined) throw notFound();
          return { worker: readOne(one) };
        }
        return { workers: Object.values(workers).map(readOne) };
      }
      const id = decodeURIComponent(path.slice(WORKERS_URL.length + 1));
      const body = JSON.parse(options.body ?? '{}');
      const w = workers[id];
      if (id === WORKER_IDS.alertTriage && body.enabled && !analysis) {
        throw Object.assign(new Error('Alert Triage requires alert analysis to be turned on'), {
          status: 400,
        });
      }
      if (body.enabled && !w.settings.serviceAccountId && !body.settings?.serviceAccountId) {
        throw Object.assign(new Error('enabled without a service account'), { status: 400 });
      }
      w.enabled = body.enabled ?? w.enabled;
      // F6: `serviceAccountId: null` clears the field (contract semantics);
      // spread-merge would keep the run's value forever.
      const { serviceAccountId, ...rest } = body.settings ?? {};
      if (serviceAccountId === null) {
        w.settings = { ...w.settings, ...rest };
        delete w.settings.serviceAccountId;
      } else {
        w.settings = { ...w.settings, ...body.settings };
      }
      w.settingsRevision = (w.settingsRevision ?? 0) + 1;
      if (installOnEnable && w.enabled) w.workflowId = `${id}-default`;
      return { worker: w };
    }
    if (path === SA_URL) {
      if (method === 'GET') return { serviceAccounts: accounts };
      const created = {
        id: `sa-${accounts.length}`,
        ...JSON.parse(options.body ?? '{}'),
        enabled: true,
        assumable: true,
      };
      accounts.push(created);
      return created;
    }
    if (path === '/internal/security/me') return { username: 'eval_user' };
    if (path === '/api/status') return { version: { build_flavor: flavor } };
    if (path.startsWith('/api/security/role/')) {
      return role(decodeURIComponent(path.slice('/api/security/role/'.length)));
    }
    throw new Error(`unexpected ${method} ${path}`);
  });
  return {
    fetch: fetch as unknown as HttpHandler,
    calls,
    accounts,
    getSetting: () => setting,
    getAnalysis: () => analysis,
  };
};

const makeLog = () => ({ info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog);
const ctxFor = (fetch: HttpHandler) => ({ fetch, spaceId: 'default' });

describe('setupWorkerChainHarness / teardownWorkerChainHarness', () => {
  it('enables the setting before the first Workers request (else 404) and provisions an account per Worker', async () => {
    const stack = makeStack();
    const state = createHarnessState();
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state,
      log: makeLog(),
    });

    const firstWorkersCall = stack.calls.findIndex((c) => c.includes(WORKERS_URL));
    const settingWrite = stack.calls.findIndex((c) => c === `POST ${SETTING_URL}`);
    expect(settingWrite).toBeGreaterThanOrEqual(0);
    expect(settingWrite).toBeLessThan(firstWorkersCall);
    expect(stack.accounts.map((a) => a.name).sort()).toEqual([
      'alertzero_alert_triage',
      'alertzero_attack_discovery',
    ]);
    expect(Object.keys(state.workerServiceAccounts).sort()).toEqual(
      Object.values(WORKER_IDS).slice().sort()
    );
    expect(state.snapshots.map((s) => s.workerId)).toEqual([
      WORKER_IDS.alertTriage,
      WORKER_IDS.attackDiscovery,
    ]);
  });

  it('reuses existing usable accounts instead of creating duplicates', async () => {
    const stack = makeStack({
      existingAccounts: [
        { id: 'sa-t', name: 'alertzero_alert_triage', enabled: true, assumable: true },
        { id: 'sa-a', name: 'alertzero_attack_discovery', enabled: true, assumable: true },
      ],
    });
    const state = createHarnessState();
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state,
      log: makeLog(),
    });
    expect(stack.calls.filter((c) => c === `POST ${SA_URL}`)).toHaveLength(0);
    expect(state.workerServiceAccounts[WORKER_IDS.alertTriage]).toBe('sa-t');
  });

  it('binds each account to its built-in reserved role and never writes a role', async () => {
    const stack = makeStack();
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state: createHarnessState(),
      log: makeLog(),
    });
    const roleCalls = stack.calls.filter((c) => c.includes('/api/security/role/'));
    expect(roleCalls.sort()).toEqual([
      'GET /api/security/role/alertzero_alert_triage',
      'GET /api/security/role/alertzero_attack_discovery',
    ]);
    expect(
      stack.accounts.map((a) => [a.name, (a as Account & { roles?: string[] }).roles]).sort()
    ).toEqual([
      ['alertzero_alert_triage', ['alertzero_alert_triage']],
      ['alertzero_attack_discovery', ['alertzero_attack_discovery']],
    ]);
  });

  it('uses the _-prefixed predefined role on Serverless', async () => {
    const stack = makeStack({ flavor: 'serverless' });
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state: createHarnessState(),
      log: makeLog(),
    });
    expect(stack.calls.filter((c) => c.includes('/api/security/role/')).sort()).toEqual([
      'GET /api/security/role/_alertzero_alert_triage',
      'GET /api/security/role/_alertzero_attack_discovery',
    ]);
    expect(stack.accounts.map((a) => (a as Account & { roles?: string[] }).roles).sort()).toEqual([
      ['_alertzero_alert_triage'],
      ['_alertzero_attack_discovery'],
    ]);
  });

  it('fails loudly, naming the role, when the built-in role is missing, without creating an account or a role', async () => {
    const stack = makeStack({
      role: () => {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      },
    });
    await expect(
      setupWorkerChainHarness({
        fetch: stack.fetch,
        ctx: ctxFor(stack.fetch),
        state: createHarnessState(),
        log: makeLog(),
      })
    ).rejects.toThrow('reserved role "alertzero_alert_triage" is missing');
    expect(stack.calls.some((c) => c.startsWith('PUT /api/security/role/'))).toBe(false);
    expect(stack.calls.some((c) => c === `POST ${SA_URL}`)).toBe(false);
  });

  it('names the predefined role on Serverless when it is missing', async () => {
    const stack = makeStack({
      flavor: 'serverless',
      role: () => {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      },
    });
    await expect(
      setupWorkerChainHarness({
        fetch: stack.fetch,
        ctx: ctxFor(stack.fetch),
        state: createHarnessState(),
        log: makeLog(),
      })
    ).rejects.toThrow('predefined role "_alertzero_alert_triage" is missing');
  });

  it('rejects a same-named role that is not reserved', async () => {
    const stack = makeStack({ role: () => ({ metadata: {} }) });
    await expect(
      setupWorkerChainHarness({
        fetch: stack.fetch,
        ctx: ctxFor(stack.fetch),
        state: createHarnessState(),
        log: makeLog(),
      })
    ).rejects.toThrow('role "alertzero_alert_triage" is missing');
    expect(stack.calls.some((c) => c === `POST ${SA_URL}`)).toBe(false);
  });

  it('skips provisioning when a service account is pinned', async () => {
    const stack = makeStack();
    const state = createHarnessState();
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state,
      log: makeLog(),
      pinnedServiceAccountId: 'sa-pinned',
    });
    expect(stack.calls.some((c) => c.includes(SA_URL))).toBe(false);
    expect(Object.values(state.workerServiceAccounts)).toEqual(['sa-pinned', 'sa-pinned']);
  });

  it('fails loudly with the cause when the per-space workflow is not installed', async () => {
    const stack = makeStack({ installOnEnable: false });
    const state = createHarnessState();
    await expect(
      setupWorkerChainHarness({
        fetch: stack.fetch,
        ctx: ctxFor(stack.fetch),
        state,
        log: makeLog(),
      })
    ).rejects.toThrow(/workflowId=null[\s\S]*serviceAccounts\.enabled/);
  });

  it('records the setting restore as soon as it is written, so a failed setup still restores it', async () => {
    const stack = makeStack({ installOnEnable: false });
    const state = createHarnessState();
    const log = makeLog();
    await setupWorkerChainHarness({
      fetch: stack.fetch,
      ctx: ctxFor(stack.fetch),
      state,
      log,
    }).catch(() => undefined);
    expect(stack.getSetting()).toBe(true);
    await teardownWorkerChainHarness({ ctx: ctxFor(stack.fetch), state, log });
    expect(stack.getSetting()).toBeUndefined();
  });

  it('turns the alert-analysis workflow on before enabling Alert Triage, and off again in teardown', async () => {
    const stack = makeStack();
    const state = createHarnessState();
    const log = makeLog();
    await setupWorkerChainHarness({ fetch: stack.fetch, ctx: ctxFor(stack.fetch), state, log });
    expect(stack.getAnalysis()).toBe(true);
    const analysisWrite = stack.calls.indexOf(`PUT ${ALERT_ANALYSIS_SETTINGS_URL}`);
    const firstWorkerPatch = stack.calls.findIndex((c) => c.startsWith(`PATCH ${WORKERS_URL}`));
    expect(analysisWrite).toBeGreaterThanOrEqual(0);
    expect(analysisWrite).toBeLessThan(firstWorkerPatch);

    await teardownWorkerChainHarness({ ctx: ctxFor(stack.fetch), state, log });
    expect(stack.getAnalysis()).toBe(false);
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('leaves an already-enabled alert-analysis workflow alone (no write, no restore)', async () => {
    const stack = makeStack({ priorAnalysis: true });
    const state = createHarnessState();
    const log = makeLog();
    await setupWorkerChainHarness({ fetch: stack.fetch, ctx: ctxFor(stack.fetch), state, log });
    await teardownWorkerChainHarness({ ctx: ctxFor(stack.fetch), state, log });
    expect(stack.calls.filter((c) => c === `PUT ${ALERT_ANALYSIS_SETTINGS_URL}`)).toHaveLength(0);
    expect(stack.getAnalysis()).toBe(true);
  });

  it('teardown restores Workers while the setting is still on, then the setting last (to its prior value)', async () => {
    const stack = makeStack({ priorSetting: false });
    const state = createHarnessState();
    const log = makeLog();
    await setupWorkerChainHarness({ fetch: stack.fetch, ctx: ctxFor(stack.fetch), state, log });
    stack.calls.length = 0;
    await teardownWorkerChainHarness({ ctx: ctxFor(stack.fetch), state, log });

    const lastWorkerCall = stack.calls.map((c) => c.includes(WORKERS_URL)).lastIndexOf(true);
    const settingRestore = stack.calls.indexOf(`POST ${SETTING_URL}`);
    expect(lastWorkerCall).toBeGreaterThanOrEqual(0);
    expect(settingRestore).toBeGreaterThan(lastWorkerCall);
    expect(stack.getSetting()).toBe(false);
    expect(log.warning).not.toHaveBeenCalled();
  });
});
