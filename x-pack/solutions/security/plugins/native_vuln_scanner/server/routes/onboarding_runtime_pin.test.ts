/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createMockAgentPolicyService } from '@kbn/fleet-plugin/server/mocks';
import { createPolicy, OSQUERY_PINNED_YAML } from '../lib/onboarding/policy_fixture.mock';
import { createContext, createRequest, createResponse, setupRoute } from './route_harness.mock';
import { registerOnboardingRuntimePinRoute } from './onboarding_runtime_pin';

const setup = (licenseType: 'enterprise' | 'basic' = 'enterprise') => {
  const agentPolicyService = createMockAgentPolicyService();
  const soClient = savedObjectsClientMock.create();
  const esClient = {};
  const user = { username: 'elastic' };
  const route = setupRoute(registerOnboardingRuntimePinRoute, 'post', {
    licenseType,
    services: { fleet: { agentPolicyService } } as never,
  });
  const context = createContext({
    savedObjects: { client: soClient },
    elasticsearch: { client: { asInternalUser: esClient } },
    security: { authc: { getCurrentUser: () => user } },
  });
  return { ...route, agentPolicyService, soClient, esClient, user, context };
};

const run = async ({ handler, context }: ReturnType<typeof setup>, policyIds: string[]) => {
  const response = createResponse();
  await handler(context, createRequest({ body: { policyIds } }), response);
  return response;
};

const resultsOf = (response: ReturnType<typeof createResponse>) =>
  (response.ok.mock.calls[0][0] as { body: { results: Array<{ id: string; outcome: string }> } })
    .body.results;

describe('POST onboarding runtime_pin', () => {
  it('is an internal route that needs fleet-agent-policies-all', () => {
    const { routeOptions } = setup();
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/onboarding/runtime_pin');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['fleet-agent-policies-all']);
  });

  it('answers 403 LICENSE_REQUIRED below Enterprise and writes nothing', async () => {
    const ctx = setup('basic');
    const response = await run(ctx, ['a']);
    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
    });
    expect(ctx.agentPolicyService.update).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty list', { policyIds: [] }],
    ['more than 100 ids', { policyIds: Array.from({ length: 101 }, (_, i) => `p${i}`) }],
    ['an id longer than 256 characters', { policyIds: ['x'.repeat(257)] }],
  ])('rejects %s', (_, body) => {
    const { versionConfig } = setup();
    if (!versionConfig.validate) throw new Error('missing validation');
    expect(
      () => versionConfig.validate && versionConfig.validate.request.body.validate(body)
    ).toThrow();
  });

  it("updates with the request-scoped SO client, the internal ES client (as Fleet's own update handler) and { user } for audit, never forcing", async () => {
    const ctx = setup();
    ctx.agentPolicyService.getByIds.mockResolvedValue([
      createPolicy({ id: 'a', agentInternal: 'foo: bar\n' }),
    ]);

    const response = await run(ctx, ['a']);

    expect(ctx.agentPolicyService.update).toHaveBeenCalledTimes(1);
    const args = ctx.agentPolicyService.update.mock.calls[0];
    expect(args[0]).toBe(ctx.soClient);
    expect(args[1]).toBe(ctx.esClient);
    expect(args[2]).toBe('a');
    expect(args[3]).toEqual({
      advanced_settings: { agent_internal: `foo: bar\n${OSQUERY_PINNED_YAML}` },
    });
    expect(args[4]).toEqual({ user: ctx.user });
    expect(resultsOf(response)).toEqual([expect.objectContaining({ id: 'a', outcome: 'updated' })]);
  });

  it('reports one outcome per policy: updated, no_change, refused, not_found and failed', async () => {
    const ctx = setup();
    ctx.agentPolicyService.getByIds.mockResolvedValue([
      createPolicy({ id: 'new' }),
      createPolicy({ id: 'pinned', agentInternal: OSQUERY_PINNED_YAML }),
      createPolicy({ id: 'managed', isManaged: true }),
      createPolicy({ id: 'broken' }),
    ]);
    ctx.agentPolicyService.update.mockImplementation((async (
      _so: unknown,
      _es: unknown,
      id: string
    ) => {
      if (id === 'broken') throw new Error('conflict');
    }) as never);

    const response = await run(ctx, ['new', 'pinned', 'managed', 'ghost', 'broken']);

    expect(resultsOf(response).map(({ id, outcome }) => [id, outcome])).toEqual([
      ['new', 'updated'],
      ['pinned', 'no_change'],
      ['managed', 'refused'],
      ['ghost', 'not_found'],
      ['broken', 'failed'],
    ]);
    expect(ctx.agentPolicyService.update.mock.calls.map(([, , id]) => id)).toEqual([
      'new',
      'broken',
    ]);
    expect(resultsOf(response)[4]).toMatchObject({ message: 'conflict' });
  });

  it('refuses an agentless policy and never calls update', async () => {
    const ctx = setup();
    ctx.agentPolicyService.getByIds.mockResolvedValue([
      createPolicy({ id: 'agentless', supportsAgentless: true }),
    ]);
    const response = await run(ctx, ['agentless']);
    expect(resultsOf(response)).toEqual([
      expect.objectContaining({ id: 'agentless', outcome: 'refused', reason: 'agentless' }),
    ]);
    expect(ctx.agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('works without a current user', async () => {
    const ctx = setup();
    ctx.agentPolicyService.getByIds.mockResolvedValue([createPolicy({ id: 'a' })]);
    const context = createContext({
      savedObjects: { client: ctx.soClient },
      elasticsearch: { client: { asInternalUser: ctx.esClient } },
      security: { authc: { getCurrentUser: () => null } },
    });
    const response = createResponse();
    await ctx.handler(context, createRequest({ body: { policyIds: ['a'] } }), response);
    expect(ctx.agentPolicyService.update.mock.calls[0][4]).toEqual({ user: undefined });
  });

  it('answers 503 when Fleet is not available', async () => {
    const { handler } = setupRoute(registerOnboardingRuntimePinRoute, 'post', { services: {} });
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { policyIds: ['a'] } }), response);
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('answers 500 when reading the policies fails', async () => {
    const ctx = setup();
    ctx.agentPolicyService.getByIds.mockRejectedValue(new Error('boom'));
    const response = await run(ctx, ['a']);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });
});
