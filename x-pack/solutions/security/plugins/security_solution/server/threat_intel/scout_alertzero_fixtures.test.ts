/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_WORKERS_URL,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
} from '@kbn/alertzero-common';

// The Scout fixtures only need the header constant from the (heavy) Scout package.
jest.mock('@kbn/scout-security', () => ({ INTERNAL_API_HEADERS: {} }));

// Loaded at runtime: `test/` is its own TS project, so a static import would cross project boundaries.
/* eslint-disable @typescript-eslint/no-var-requires */
const helpers = jest.requireActual('../../test/scout_alertzero/ui/fixtures/helpers');
const onboarding = jest.requireActual('../../test/scout_alertzero/ui/fixtures/onboarding');
/* eslint-enable @typescript-eslint/no-var-requires */

type Body = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Call {
  method: string;
  path: string;
  body?: Body;
}
type Handler = (call: Call) => { statusCode: number; body: unknown } | undefined;

/** In-memory AlertZero API: records every call and answers from `handler` (default 200 `{}`). */
const createFakeApi = (handler: Handler = () => undefined) => {
  const calls: Call[] = [];
  const respond = (call: Call) => {
    calls.push(call);
    return Promise.resolve(handler(call) ?? { statusCode: 200, body: {} });
  };
  const api = {
    internal: (method: string, path: string, options?: { body?: unknown }) =>
      respond({ method, path, body: options?.body as Body | undefined }),
    public: (method: string, path: string, options?: { body?: unknown }) =>
      respond({ method, path, body: options?.body as Body | undefined }),
    raw: (method: string, path: string, _headers: unknown, body?: unknown) =>
      respond({ method, path, body: body as Body | undefined }),
  };
  return { api, calls };
};

const createSpaces = (order: string[] = []) => ({
  create: jest.fn(async () => order.push('create')),
  setSolutionView: jest.fn(async () => order.push('setSolutionView')),
  delete: jest.fn(async () => order.push('delete')),
});

describe('Scout AlertZero onboarding fixtures', () => {
  describe('pure helpers', () => {
    it('spaceUrl namespaces non-default spaces only', () => {
      expect(helpers.spaceUrl(ALERTZERO_WORKERS_URL, 'default')).toBe(ALERTZERO_WORKERS_URL);
      expect(helpers.spaceUrl(ALERTZERO_WORKERS_URL, 'space-1')).toBe(
        `/s/space-1${ALERTZERO_WORKERS_URL}`
      );
    });

    it('isWorkerEnableBlocked reports only the no_model reason', () => {
      expect(helpers.isWorkerEnableBlocked({ blockingReasons: ['no_model'] })).toBe(true);
      expect(helpers.isWorkerEnableBlocked({ blockingReasons: ['other'] })).toBe(false);
      expect(helpers.isWorkerEnableBlocked({})).toBe(false);
    });

    it('ok returns 2xx bodies and throws with the status otherwise', () => {
      expect(helpers.ok({ statusCode: 200, body: { workers: [] } }, 't')).toStrictEqual({
        workers: [],
      });
      expect(() => helpers.ok({ statusCode: 404, body: {} }, 't')).toThrow(/404/);
    });
  });

  describe('buildOnboardingSpace (via createOnboardingSpace)', () => {
    it('switches the new space to the Security view before enabling the gate', async () => {
      const order: string[] = [];
      const spaces = createSpaces(order);
      const kbnClient = {
        request: jest.fn(async ({ path }: { path: string }) => {
          order.push(`request ${path}`);
          return { status: 200, data: { workers: [] } };
        }),
      };
      await onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: false });

      expect(spaces.setSolutionView).toHaveBeenCalledWith({
        id: expect.stringMatching(/^scout-onb-/),
        solution: 'security',
      });
      const viewAt = order.indexOf('setSolutionView');
      const gateAt = order.findIndex((entry) => entry.includes('internal/kibana/settings'));
      expect(viewAt).toBeGreaterThan(-1);
      expect(gateAt).toBeGreaterThan(viewAt);
    });

    it('pins an explicitly empty model assignment for the no-model case', async () => {
      const spaces = createSpaces();
      const requests: Array<{ method: string; path: string; body?: Body }> = [];
      const kbnClient = {
        request: jest.fn(async (req: { method: string; path: string; body?: Body }) => {
          requests.push(req);
          return { status: 200, data: {} };
        }),
      };
      await onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: false });

      const put = requests.find((r) => r.method === 'PUT' && r.path.includes('inference'));
      expect(put?.body).toStrictEqual({
        features: [{ feature_id: ALERTZERO_INFERENCE_PARENT_FEATURE_ID, endpoints: [] }],
      });
    });

    it('does not pin an empty assignment when a stub model is seeded', async () => {
      const spaces = createSpaces();
      const requests: Array<{ method: string; path: string; body?: Body }> = [];
      const kbnClient = {
        request: jest.fn(async (req: { method: string; path: string; body?: Body }) => {
          requests.push(req);
          if (req.method === 'POST' && req.path.includes('api/actions/connector')) {
            return { status: 200, data: { id: 'conn-1' } };
          }
          if (req.method === 'GET' && req.path.includes('inference')) {
            return { status: 200, data: { data: { features: [] } } };
          }
          return { status: 200, data: {} };
        }),
      };
      await onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: true });

      const puts = requests.filter((r) => r.method === 'PUT' && r.path.includes('inference'));
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.features[0].endpoints).toStrictEqual([{ id: 'conn-1' }]);
    });

    it('deletes the space and the stub connector when setup fails after the connector exists', async () => {
      const spaces = createSpaces();
      const requests: Array<{ method: string; path: string }> = [];
      const kbnClient = {
        request: jest.fn(async (req: { method: string; path: string }) => {
          requests.push(req);
          if (req.method === 'POST' && req.path.includes('api/actions/connector')) {
            return { status: 200, data: { id: 'conn-1' } };
          }
          if (req.method === 'GET' && req.path.includes('inference')) {
            return { status: 200, data: { data: { features: [] } } };
          }
          if (req.method === 'PUT' && req.path.includes('inference')) {
            return { status: 500, data: {} };
          }
          return { status: 200, data: {} };
        }),
      };

      await expect(
        onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: true })
      ).rejects.toThrow(/assign stub model/);

      expect(
        requests.some((r) => r.method === 'DELETE' && r.path.includes('api/actions/connector/'))
      ).toBe(true);
      expect(spaces.delete).toHaveBeenCalledTimes(1);
    });

    it('deletes the space when the very first setup step fails', async () => {
      const spaces = createSpaces();
      spaces.setSolutionView.mockRejectedValueOnce(new Error('view boom'));
      const kbnClient = { request: jest.fn(async () => ({ status: 200, data: {} })) };

      await expect(
        onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: false })
      ).rejects.toThrow('view boom');
      expect(spaces.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('supply baseline', () => {
    const status = (ingest: boolean, enrich: boolean) => ({
      statusCode: 200,
      body: {
        workflows: [
          { key: 'ingest', enabled: ingest, installed: true },
          { key: 'enrich', enabled: enrich, installed: true },
          { key: 'attribute', enabled: false, installed: true },
        ],
      },
    });

    it('records the deployment-wide rows only', async () => {
      const { api } = createFakeApi(() => status(true, false));
      await expect(helpers.readSupplyBaseline(api, 'space-1')).resolves.toStrictEqual({
        ingest: true,
        enrich: false,
      });
    });

    it('returns undefined when the status cannot be read', async () => {
      const { api } = createFakeApi(() => ({ statusCode: 500, body: {} }));
      await expect(helpers.readSupplyBaseline(api, 'space-1')).resolves.toBeUndefined();
    });

    it('re-enables a row that cleanup left disabled, and leaves matching rows alone', async () => {
      const { api, calls } = createFakeApi(({ method }) =>
        method === 'GET' ? status(false, false) : undefined
      );
      await helpers.restoreSupplyBaseline(api, 'space-1', { ingest: true, enrich: false });

      const puts = calls.filter((c) => c.method === 'PUT');
      expect(puts).toHaveLength(1);
      expect(puts[0].path).toContain('system-security-threat-intel-ingest-feeds');
      expect(puts[0].body).toStrictEqual({ enabled: true });
    });

    it('is restored by the space cleanup after enable-time drift', async () => {
      let ingestEnabled = true;
      const kbnClient = {
        request: jest.fn(async (req: { method: string; path: string; body?: Body }) => {
          if (req.path.includes('hunt/threat_intel_supply') || req.path.includes('supply')) {
            if (req.method === 'GET') {
              return {
                status: 200,
                data: {
                  workflows: [
                    { key: 'ingest', enabled: ingestEnabled, installed: true },
                    { key: 'enrich', enabled: true, installed: true },
                  ],
                },
              };
            }
          }
          if (req.method === 'PUT' && req.path.includes('workflows/managed')) {
            ingestEnabled = req.body?.enabled;
          }
          if (req.method === 'GET' && req.path.endsWith(ALERTZERO_WORKERS_URL)) {
            // Cleanup's reset disables Hunt, which tears the ingest workflow down.
            ingestEnabled = false;
            return { status: 200, data: { workers: [] } };
          }
          return { status: 200, data: {} };
        }),
      };
      const space = await onboarding.createUiOnboardingSpace(kbnClient, createSpaces(), {
        withStubModel: false,
      });
      await space.cleanup();

      expect(ingestEnabled).toBe(true);
    });
  });

  describe('service account ownership', () => {
    const accountsUrl = SECURITY_SERVICE_ACCOUNT_URL;

    /** kbnClient fake: serves the baseline account list and a worker list referencing `referenced`. */
    const createKbnClient = ({
      baselineStatus = 200,
      baselinePages = [{ serviceAccounts: [{ id: 'shared-acct' }] }],
      referenced,
    }: {
      baselineStatus?: number;
      baselinePages?: Array<{ serviceAccounts: Array<{ id: string }>; nextPage?: string }>;
      referenced: string[];
    }) => {
      const requests: Array<{ method: string; path: string }> = [];
      const request = jest.fn(async (req: { method: string; path: string }) => {
        requests.push(req);
        if (req.method === 'GET' && req.path.startsWith(`${accountsUrl}?`)) {
          if (baselineStatus !== 200) return { status: baselineStatus, data: {} };
          const after = new URL(req.path, 'http://localhost').searchParams.get('after');
          const index = after ? baselinePages.findIndex((page) => page.nextPage === after) + 1 : 0;
          return { status: 200, data: baselinePages[index] };
        }
        if (req.method === 'GET' && req.path.endsWith(ALERTZERO_WORKERS_URL)) {
          return {
            status: 200,
            data: {
              workers: referenced.map((id, i) => ({
                id: `worker-${i}`,
                enabled: false,
                settings: { serviceAccountId: id },
              })),
            },
          };
        }
        return { status: 200, data: {} };
      });
      return { kbnClient: { request }, requests };
    };

    const accountDeletes = (requests: Array<{ method: string; path: string }>) =>
      requests.filter((r) => r.method === 'DELETE' && r.path.includes('service_account'));

    it('deletes an account created after setup but preserves one from the baseline snapshot', async () => {
      const { kbnClient, requests } = createKbnClient({
        referenced: ['shared-acct', 'created-acct'],
      });
      const space = await onboarding.createUiOnboardingSpace(kbnClient, createSpaces(), {
        withStubModel: false,
      });
      await space.cleanup();

      const deletes = accountDeletes(requests);
      expect(deletes).toHaveLength(1);
      expect(deletes[0].path).toContain('created-acct');
    });

    it('paginates the baseline listing across nextPage', async () => {
      const { kbnClient, requests } = createKbnClient({
        baselinePages: [
          { serviceAccounts: [{ id: 'acct-a' }], nextPage: 'cursor/1+=' },
          { serviceAccounts: [{ id: 'acct-b' }] },
        ],
        referenced: ['acct-a', 'acct-b', 'created-acct'],
      });
      const space = await onboarding.createUiOnboardingSpace(kbnClient, createSpaces(), {
        withStubModel: false,
      });
      await space.cleanup();

      const lists = requests.filter((r) => r.path.startsWith(`${accountsUrl}?`));
      expect(lists).toHaveLength(2);
      expect(lists[0].path).toBe(`${accountsUrl}?limit=100`);
      expect(lists[1].path).toBe(
        `${accountsUrl}?limit=100&after=${encodeURIComponent('cursor/1+=')}`
      );
      const deletes = accountDeletes(requests);
      expect(deletes).toHaveLength(1);
      expect(deletes[0].path).toContain('created-acct');
    });

    it('returns every id across pages and undefined when a page cannot be read', async () => {
      const pages = [
        { statusCode: 200, body: { serviceAccounts: [{ id: 'a' }], nextPage: 'n' } },
        { statusCode: 200, body: { serviceAccounts: [{ id: 'b' }] } },
      ];
      const paged = createFakeApi(() => pages.shift());
      await expect(helpers.listServiceAccountIds(paged.api)).resolves.toStrictEqual(
        new Set(['a', 'b'])
      );

      const second = [
        { statusCode: 200, body: { serviceAccounts: [{ id: 'a' }], nextPage: 'n' } },
        { statusCode: 500, body: {} },
      ];
      const failing = createFakeApi(() => second.shift());
      await expect(helpers.listServiceAccountIds(failing.api)).resolves.toBeUndefined();
    });

    it('fails setup and deletes no service account when the baseline could not be read', async () => {
      const { kbnClient, requests } = createKbnClient({
        baselineStatus: 500,
        referenced: ['shared-acct', 'created-acct'],
      });
      const spaces = createSpaces();

      // Unreadable baseline is fail-fast: setup rejects (never silently
      // degrades to "delete nothing" while leaking created accounts).
      await expect(
        onboarding.createUiOnboardingSpace(kbnClient, spaces, { withStubModel: false })
      ).rejects.toThrow(/Could not read the service-account baseline/);

      // Teardown still ran (the space is deleted) and no service account was.
      expect(spaces.delete).toHaveBeenCalledTimes(1);
      expect(accountDeletes(requests)).toHaveLength(0);
    });
  });

  describe('enableFirstWorker', () => {
    const worker = {
      id: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
      enabled: false,
      settingsRevision: 3,
    };

    it('deletes the throwaway service account when the enable PATCH fails', async () => {
      const { api, calls } = createFakeApi(({ method, path }) => {
        if (method === 'GET') return { statusCode: 200, body: { workers: [worker] } };
        if (method === 'POST' && path.includes('service_account')) {
          return { statusCode: 200, body: { id: 'acct-1' } };
        }
        if (method === 'PATCH') return { statusCode: 500, body: { message: 'nope' } };
        return undefined;
      });

      const owned: string[] = [];
      await expect(
        onboarding.enableFirstWorker({
          spaceId: 'space-1',
          api,
          trackOwnedAccountId: (id) => owned.push(id),
        })
      ).rejects.toThrow(/failed: 500/);
      expect(owned).toEqual(['acct-1']);

      const deletes = calls.filter((c) => c.method === 'DELETE');
      expect(deletes).toHaveLength(1);
      expect(deletes[0].path).toContain('acct-1');
    });

    it('keeps the account and binds it to the worker when the enable succeeds', async () => {
      const { api, calls } = createFakeApi(({ method, path }) => {
        if (method === 'GET') return { statusCode: 200, body: { workers: [worker] } };
        if (method === 'POST' && path.includes('service_account')) {
          return { statusCode: 200, body: { id: 'acct-1' } };
        }
        return undefined;
      });

      const owned: string[] = [];
      await onboarding.enableFirstWorker({
        spaceId: 'space-1',
        api,
        trackOwnedAccountId: (id) => owned.push(id),
      });
      expect(owned).toEqual(['acct-1']);
      expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
      const patch = calls.find((c) => c.method === 'PATCH');
      expect(patch?.body).toMatchObject({
        enabled: true,
        settings: { serviceAccountId: 'acct-1' },
      });
    });
  });

  describe('seedClosedProposal index mapping', () => {
    it('creates the proposals index with the storage adapter date format on every date field', async () => {
      const esClient = {
        indices: {
          existsAlias: jest.fn(async () => false),
          create: jest.fn(async (_args: unknown) => ({})),
        },
        index: jest.fn(async () => ({})),
      };
      await onboarding.seedClosedProposal(esClient, 'space-1', {
        title: 't',
        decidedAtHoursAgo: 1,
      });

      const { mappings } = esClient.indices.create.mock.calls[0][0] as unknown as {
        mappings: { properties: Body };
      };
      for (const field of ['expiresAt', 'decidedAt', 'createdAt', 'gateReleasedAt']) {
        expect(mappings.properties[field]).toStrictEqual({
          type: 'date',
          format: 'strict_date_optional_time',
        });
      }
      // Fields the server schema defines that the seed previously omitted.
      expect(mappings.properties.actionInput).toStrictEqual({ type: 'flattened' });
      expect(mappings.properties.actionWorkflowId).toStrictEqual({ type: 'keyword' });
      expect(mappings.properties.createdBy.properties.profileUid).toStrictEqual({
        type: 'keyword',
      });
    });
  });
});
