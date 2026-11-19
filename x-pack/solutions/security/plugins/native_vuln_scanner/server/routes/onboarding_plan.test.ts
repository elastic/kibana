/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createMockAgentPolicyService } from '@kbn/fleet-plugin/server/mocks';
import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server';
import { createPolicy } from '../lib/onboarding/policy_fixture.mock';
import { createContext, createRequest, createResponse, setupRoute } from './route_harness.mock';
import { registerOnboardingPlanRoute } from './onboarding_plan';

const setup = (licenseType: 'enterprise' | 'basic' = 'enterprise') => {
  const agentPolicyService = createMockAgentPolicyService();
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
  const route = setupRoute(registerOnboardingPlanRoute, 'post', {
    licenseType,
    services: { fleet: { agentPolicyService } } as never,
  });
  const context = createContext({ savedObjects: { client: soClient } });
  return { ...route, agentPolicyService, soClient, context };
};

describe('POST onboarding plan', () => {
  it('is an internal route that needs fleet-agent-policies-all', () => {
    const { routeOptions } = setup();
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/onboarding/plan');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['fleet-agent-policies-all']);
  });

  it('answers 403 LICENSE_REQUIRED below Enterprise', async () => {
    const { handler, context, agentPolicyService } = setup('basic');
    const response = createResponse();
    await handler(context, createRequest({ body: { policyIds: ['a'] } }), response);
    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
    });
    expect(agentPolicyService.getByIds).not.toHaveBeenCalled();
  });

  describe('validation', () => {
    const validate = (body: unknown) => {
      const { versionConfig } = setup();
      if (!versionConfig.validate) throw new Error('missing validation');
      return versionConfig.validate.request.body.validate(body);
    };

    it('accepts one to 100 ids', () => {
      expect(() => validate({ policyIds: ['a'] })).not.toThrow();
      expect(() =>
        validate({ policyIds: Array.from({ length: 100 }, (_, i) => `p${i}`) })
      ).not.toThrow();
    });

    it.each([
      ['an empty list', { policyIds: [] }],
      ['more than 100 ids', { policyIds: Array.from({ length: 101 }, (_, i) => `p${i}`) }],
      ['an id longer than 256 characters', { policyIds: ['x'.repeat(257)] }],
      ['an empty id', { policyIds: [''] }],
      ['a missing list', {}],
    ])('rejects %s', (_, body) => {
      expect(() => validate(body)).toThrow();
    });
  });

  it('returns the plan for the requested policies', async () => {
    const { handler, context, agentPolicyService, soClient } = setup();
    agentPolicyService.getByIds.mockResolvedValue([createPolicy({ id: 'a' })]);
    const response = createResponse();

    await handler(context, createRequest({ body: { policyIds: ['a', 'ghost'] } }), response);

    expect(agentPolicyService.getByIds).toHaveBeenCalledWith(soClient, ['a', 'ghost'], {
      withPackagePolicies: true,
      ignoreMissing: true,
    });
    const [{ body }] = response.ok.mock.calls[0] as [
      { body: { policies: Array<{ outcome: string }> } }
    ];
    expect(body.policies.map(({ outcome }) => outcome)).toEqual(['change', 'not_found']);
    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });

  it('answers 503 when Fleet is not available', async () => {
    const { handler } = setupRoute(registerOnboardingPlanRoute, 'post', { services: {} });
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { policyIds: ['a'] } }), response);
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('answers 403 when Fleet denies the caller', async () => {
    const { handler, context, agentPolicyService } = setup();
    agentPolicyService.getByIds.mockRejectedValue(new FleetUnauthorizedError('nope'));
    const response = createResponse();
    await handler(context, createRequest({ body: { policyIds: ['a'] } }), response);
    expect(response.forbidden).toHaveBeenCalledWith({ body: { message: 'nope' } });
  });

  it('answers 500 on an unexpected error', async () => {
    const { handler, context, agentPolicyService } = setup();
    agentPolicyService.getByIds.mockRejectedValue(new Error('boom'));
    const response = createResponse();
    await handler(context, createRequest({ body: { policyIds: ['a'] } }), response);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });
});
