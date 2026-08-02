/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ApplyTuningRequestBody,
  PND_TUNABLE_RULE_FIELDS,
  PND_TUNING_APPLY_URL_TEMPLATE,
} from '@kbn/pnd-common';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';

import type { RouteDependencies } from '../../register_routes';
import { registerApplyTuningRoute } from './apply_tuning';
import { resolveApprovedTuningTarget } from './helpers/resolve_approved_tuning';

jest.mock('./helpers/resolve_approved_tuning');

const resolveApprovedTuningTargetMock = resolveApprovedTuningTarget as jest.MockedFunction<
  typeof resolveApprovedTuningTarget
>;

const PROPOSAL_ID = 'proposal-1';

/** The rule the confirming read answers with unless a test asks for another one. */
const QUERY_RULE = '{"id":"rule-1","type":"query"}';

const toResponse = (status: number, text: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(text),
  } as unknown as Response);

/**
 * `status` / `text` answer the rule **PATCH**; `ruleStatus` / `ruleText` answer the confirming rule
 * **read** a `query` change triggers (`findQueryChangeRefusal`). Both go through one self client, and
 * only the PATCH carries a `method` — which is what {@link patchCalls} keys off too, so a test can
 * still assert "the detection engine was never written to" while the read did happen.
 */
const createHttp = (
  status: number,
  text: string,
  { ruleStatus = 200, ruleText = QUERY_RULE }: { ruleStatus?: number; ruleText?: string } = {}
) => {
  const fetch = jest
    .fn()
    .mockImplementation((_path: string, options?: { method?: string }) =>
      options?.method === 'PATCH'
        ? { response: toResponse(status, text) }
        : { response: toResponse(ruleStatus, ruleText) }
    );
  const asScoped = jest.fn().mockReturnValue({ fetch });
  return { http: { selfClient: { asScoped } }, asScoped, fetch };
};

/** The self-client calls that wrote to the detection engine, ignoring any confirming read. */
const patchCalls = (fetch: jest.Mock): unknown[] =>
  fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH');

const createDeps = (http: ReturnType<typeof createHttp>['http']) => {
  const router = mockRouter.create();
  const deps = {
    config: { demo: { forceIncident: false }, enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{ http }]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue({}),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('post', PND_TUNING_APPLY_URL_TEMPLATE).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  {
    body = { change: { enabled: false }, id: 'rule-1', rationale: 'reduces false positives' },
    proposalId = PROPOSAL_ID,
  }: { body?: Record<string, unknown>; proposalId?: string } = {}
) => {
  const request = httpServerMock.createKibanaRequest({ body, params: { proposalId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerApplyTuningRoute', () => {
  beforeEach(() => {
    resolveApprovedTuningTargetMock.mockResolvedValue({ status: 'ok' });
  });

  it('gates the route on the detection-rules write privilege (S2)', () => {
    const deps = createDeps(createHttp(200, '{"id":"rule-1"}').http);

    registerApplyTuningRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_TUNING_APPLY_URL_TEMPLATE).config.security
    ).toEqual({ authz: { requiredPrivileges: [RULES_API_ALL] } });
  });

  it('registers the route as an internal API', () => {
    const deps = createDeps(createHttp(200, '{"id":"rule-1"}').http);

    registerApplyTuningRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_TUNING_APPLY_URL_TEMPLATE).config.access
    ).toEqual('internal');
  });

  it('patches the rule as the calling user (self client scoped to the request, S2)', async () => {
    const { http, asScoped } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const request = httpServerMock.createKibanaRequest({
      body: { change: { enabled: false }, id: 'rule-1', rationale: 'ok' },
      params: { proposalId: PROPOSAL_ID },
    });
    const response = httpServerMock.createResponseFactory();
    await getHandler(deps.router)({} as never, request, response);

    expect(asScoped).toHaveBeenCalledWith(request);
  });

  it('strips the audit rationale out of the detection-rule patch body', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router));

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { enabled: false, id: 'rule-1' } })
    );
  });

  it('flattens the change into the patch, because a nested object would change nothing', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { note: 'Check the patch window.' }, id: 'rule-1', rationale: 'ok' },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { id: 'rule-1', note: 'Check the patch window.' } })
    );
  });

  it('applies a query rewrite to a query rule, which is what the review flow exists for', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { query: 'event.code:4688' }, id: 'rule-1', rationale: 'ok' },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { id: 'rule-1', query: 'event.code:4688' } })
    );
  });

  it('names the refused field, so the caller learns what it authorized was not applied', async () => {
    const deps = createDeps(createHttp(200, '{"id":"rule-1"}').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: {
        change: { alert_suppression: { group_by: ['host.name'] } },
        id: 'rule-1',
        rationale: 'ok',
      },
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message:
          'Tuning may not change alert_suppression; PND tunable fields are enabled, investigation_fields, note, query',
      },
    });
  });

  it('refuses a permitted change carrying an unsafe field alongside it, rather than applying half', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: {
        change: { alert_suppression: { group_by: ['host.name'] }, enabled: false },
        id: 'rule-1',
        rationale: 'ok',
      },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a tuning that proposes no change, so a no-op can never look applied', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { id: 'rule-1', rationale: 'ok' },
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns { applied: true } with the updated rule id on success', async () => {
    const deps = createDeps(createHttp(200, '{"id":"rule-1"}').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { applied: true, proposalId: PROPOSAL_ID, ruleId: 'rule-1' },
    });
  });

  it('accepts a rule identified by rule_id', async () => {
    const { http, fetch } = createHttp(200, '{"id":"generated-uuid"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { enabled: false }, rule_id: 'external-rule-id', rationale: 'ok' },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { enabled: false, rule_id: 'external-rule-id' } })
    );
  });

  // The patch is asserted as an **object**, never a JSON string: Core's self client forwards a
  // string body untouched and sets `content-type` only for a non-string one, so a pre-serialized
  // body reaches the detection-engine route unparsed and 400s. See the note on `patchDetectionRule`
  // (`helpers/patch_detection_rule/index.ts`), which pins the same shape directly.
  it.each(PND_TUNABLE_RULE_FIELDS)('applies the tunable field %s', async (field) => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { [field]: 'value' }, id: 'rule-1', rationale: 'ok' },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { id: 'rule-1', [field]: 'value' } })
    );
  });

  it('rejects a tuning that identifies no rule with a 400', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), { body: { rationale: 'ok' } });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces a downstream 403 visibly rather than as a silent success (S2)', async () => {
    const deps = createDeps(createHttp(403, 'forbidden').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.forbidden).toHaveBeenCalledTimes(1);
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('maps a downstream 404 to a 404', async () => {
    const deps = createDeps(createHttp(404, 'not found').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('maps a downstream 400 to a 400', async () => {
    const deps = createDeps(createHttp(400, 'bad').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('maps any other downstream failure to that status via customError', async () => {
    const deps = createDeps(createHttp(500, 'boom').http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('maps a transport error to a 500', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const http = { selfClient: { asScoped: jest.fn().mockReturnValue({ fetch }) } };
    const deps = createDeps(http as never);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});

describe('registerApplyTuningRoute — server-side tunable-field allow-list (B6a layer 3)', () => {
  // A grouping change is what the demo headline ("a real detection rule changes") must never be
  // demonstrating: an alert count measured either side of it does not describe what it did.
  it('rejects an alert_suppression patch with a 400', async () => {
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: {
        change: { alert_suppression: { group_by: ['host.name'] } },
        id: 'rule-1',
        rationale: 'ok',
      },
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('never reaches the detection engine with an alert_suppression patch', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: {
        change: { alert_suppression: { group_by: ['host.name'] } },
        id: 'rule-1',
        rationale: 'ok',
      },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('names the rejected field so the failure is actionable', async () => {
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { change: { threshold: { value: 1 } }, id: 'rule-1', rationale: 'ok' },
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('threshold') },
    });
  });

  // The route is the boundary, not the schema: a caller that bypasses validation — or a schema edit
  // that widens `change` by accident — still hits this.
  it.each(['alert_suppression', 'threshold', 'exceptions_list', 'index', 'severity'])(
    'rejects a %s patch',
    async (field) => {
      const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
      const deps = createDeps(http);
      registerApplyTuningRoute(deps);

      const response = await invoke(getHandler(deps.router), {
        body: { change: { [field]: 'value' }, id: 'rule-1', rationale: 'ok' },
      });

      expect([response.badRequest.mock.calls.length, fetch.mock.calls.length]).toEqual([1, 0]);
    }
  );

  it('rejects a disallowed field smuggled in at the top level rather than inside change', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { id: 'rule-1', name: 'renamed by the model', rationale: 'ok' },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects the whole patch when only one of several fields is disallowed', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: {
        change: { note: '## guide', threshold: { value: 1 } },
        id: 'rule-1',
        rationale: 'ok',
      },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('checks the rule identifier before the allow-list, so a rule-less patch reports that first', async () => {
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { change: { threshold: { value: 1 } }, rationale: 'ok' },
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('identify a rule') },
    });
  });
});

/**
 * The half of the boundary only the route can hold: `query` is a tunable field, but it means
 * something only on a rule whose `type` is `query`, and the request cannot carry that fact. The
 * detection-engine route does not reject a `query` on an `eql` or `machine_learning` rule — it
 * ignores the field and answers `200` — so without this read PND would report `applied: true` for a
 * rule whose detection logic never moved.
 */
describe('registerApplyTuningRoute — query changes are confirmed against the rule type', () => {
  const queryChange = {
    change: { query: 'process.name : "powershell.exe" and process.args : "-enc"' },
    id: 'rule-1',
    rationale: 'Narrow the unqualified PowerShell query',
  };

  it('reads the rule as the calling user before patching it (S3)', async () => {
    const { http, asScoped } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const request = httpServerMock.createKibanaRequest({
      body: queryChange,
      params: { proposalId: PROPOSAL_ID },
    });
    await getHandler(deps.router)({} as never, request, httpServerMock.createResponseFactory());

    expect(asScoped).toHaveBeenCalledWith(request);
  });

  it('reads the rule in the space resolved from the request (S9)', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), { body: queryChange });

    expect(fetch).toHaveBeenCalledWith(
      '/s/agent-3/api/detection_engine/rules',
      expect.objectContaining({ query: { id: 'rule-1' } })
    );
  });

  // The common tuning must not pay for a rules read it has no use for.
  it('does not read the rule for a change that leaves the query alone', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { note: '## guide' }, id: 'rule-1', rationale: 'ok' },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  describe.each(['eql', 'machine_learning', 'threshold', 'esql'])(
    'when the chosen rule is a %s rule',
    (type) => {
      it('refuses the tuning with a 400 naming the field', async () => {
        const { http } = createHttp(200, '{"id":"rule-1"}', {
          ruleText: `{"id":"rule-1","type":"${type}"}`,
        });
        const deps = createDeps(http);
        registerApplyTuningRoute(deps);

        const response = await invoke(getHandler(deps.router), { body: queryChange });

        expect(response.badRequest).toHaveBeenCalledWith({
          body: { message: expect.stringContaining('may not change query') },
        });
      });

      it('never patches the rule', async () => {
        const { http, fetch } = createHttp(200, '{"id":"rule-1"}', {
          ruleText: `{"id":"rule-1","type":"${type}"}`,
        });
        const deps = createDeps(http);
        registerApplyTuningRoute(deps);

        await invoke(getHandler(deps.router), { body: queryChange });

        expect(patchCalls(fetch)).toHaveLength(0);
      });

      it('never reports the refused tuning as applied', async () => {
        const { http } = createHttp(200, '{"id":"rule-1"}', {
          ruleText: `{"id":"rule-1","type":"${type}"}`,
        });
        const deps = createDeps(http);
        registerApplyTuningRoute(deps);

        const response = await invoke(getHandler(deps.router), { body: queryChange });

        expect(response.ok).not.toHaveBeenCalled();
      });
    }
  );

  it('applies the tuning when the chosen rule is a query rule', async () => {
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), { body: queryChange });

    expect(response.ok).toHaveBeenCalledWith({
      body: { applied: true, proposalId: PROPOSAL_ID, ruleId: 'rule-1' },
    });
  });

  // An unconfirmed type is not a confirmed one: refusing is the only answer that cannot report a
  // rule as tuned when its query never moved.
  it.each([403, 404, 500])('refuses the tuning when the rule read answers %s', async (status) => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}', { ruleStatus: status });
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), { body: queryChange });

    expect([response.badRequest.mock.calls.length, patchCalls(fetch).length]).toEqual([1, 0]);
  });

  it('refuses a query change on a rule identified only by rule_id, whose type it cannot read', async () => {
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { change: queryChange.change, rationale: 'ok', rule_id: 'external-1' },
    });

    expect([response.badRequest.mock.calls.length, patchCalls(fetch).length]).toEqual([1, 0]);
  });

  it('still applies a non-query change to a rule identified only by rule_id', async () => {
    const { http, fetch } = createHttp(200, '{"id":"generated-uuid"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { change: { enabled: false }, rationale: 'ok', rule_id: 'external-1' },
    });

    expect(patchCalls(fetch)).toHaveLength(1);
  });
});

describe('ApplyTuningRequestBody (contract relied on by the route)', () => {
  it('rejects a missing rationale', () => {
    expect(ApplyTuningRequestBody.safeParse({ id: 'rule-1' }).success).toBe(false);
  });

  it('rejects a whitespace-only rationale', () => {
    expect(ApplyTuningRequestBody.safeParse({ id: 'rule-1', rationale: '   ' }).success).toBe(
      false
    );
  });

  it('returns 503 when the workflows management client is unavailable', async () => {
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    (deps.getWorkflowsManagementClient as jest.Mock).mockReturnValue(undefined);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'Workflows management API is not available' },
    });
  });

  it('returns 404 when no approved apply-tuning gate binds the proposal', async () => {
    resolveApprovedTuningTargetMock.mockResolvedValue({ status: 'not_found' });
    const { http, fetch } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    await invoke(getHandler(deps.router));

    expect(patchCalls(fetch)).toHaveLength(0);
  });

  it('surfaces a bind refusal as 404', async () => {
    resolveApprovedTuningTargetMock.mockResolvedValue({ status: 'not_approved' });
    const { http } = createHttp(200, '{"id":"rule-1"}');
    const deps = createDeps(http);
    registerApplyTuningRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.notFound).toHaveBeenCalled();
  });

  it('accepts a rule id, a constrained change and a rationale', () => {
    expect(
      ApplyTuningRequestBody.safeParse({
        change: { enabled: false },
        id: 'rule-1',
        rationale: 'ok',
      }).success
    ).toBe(true);
  });

  it('strips a top-level field that is not part of the contract (B6a layer 2)', () => {
    expect(ApplyTuningRequestBody.parse({ id: 'rule-1', name: 'tuned', rationale: 'ok' })).toEqual({
      id: 'rule-1',
      rationale: 'ok',
    });
  });

  it('strips a change field outside PND_TUNABLE_RULE_FIELDS, which is why the route re-checks', () => {
    expect(
      ApplyTuningRequestBody.parse({
        change: { enabled: false, threshold: { value: 1 } },
        id: 'rule-1',
        rationale: 'ok',
      }).change
    ).toEqual({ enabled: false });
  });

  // The contract carries `query`; the precondition it cannot express — the rule's `type` must be
  // `query` — is the route's to enforce, which is why `_apply` re-fetches the rule.
  it('keeps a query rewrite, which the route confirms against the rule type', () => {
    expect(
      ApplyTuningRequestBody.parse({
        change: { query: 'event.code:4688' },
        id: 'rule-1',
        rationale: 'ok',
      }).change
    ).toEqual({ query: 'event.code:4688' });
  });
});
