/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  assertCanChangeBoundWorkflows,
  asDetectionEngineAccount,
  reassignRulesToAccount,
} from './detection_engine_account';

const request = httpServerMock.createKibanaRequest();

const setup = ({
  boundAccountId,
  principal,
}: {
  boundAccountId: string | undefined;
  principal: { type: 'user' } | { type: 'service_account'; serviceAccountId: string } | null;
}) => {
  const accountRequest = httpServerMock.createKibanaRequest();
  const serviceAccounts = {
    isEnabled: jest.fn(() => true),
    getWorkloadBinding: jest.fn(async () =>
      boundAccountId ? { serviceAccountId: boundAccountId } : undefined
    ),
    withScopedRequestForWorkload: jest.fn(
      async (_: unknown, fn: (scopedRequest: typeof request) => Promise<unknown>) =>
        fn(accountRequest)
    ),
  };
  const core = {
    security: { serviceAccounts, authc: { getPrincipal: jest.fn(() => principal) } },
  };
  const fn = jest.fn(async (scopedRequest: typeof request) => scopedRequest);
  const run = () =>
    asDetectionEngineAccount({ core: core as never, request, spaceId: 'space-a', fn });
  return { run, fn, serviceAccounts, accountRequest };
};

describe('asDetectionEngineAccount', () => {
  it('is refused with a 503 when the space is not set up', async () => {
    const { run, fn } = setup({ boundAccountId: undefined, principal: { type: 'user' } });

    await expect(run()).rejects.toMatchObject({ statusCode: 503 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("swaps a user's request for one authenticated as the space's account", async () => {
    const { run, fn, serviceAccounts, accountRequest } = setup({
      boundAccountId: 'account-id',
      principal: { type: 'user' },
    });

    await expect(run()).resolves.toBe(accountRequest);
    expect(serviceAccounts.withScopedRequestForWorkload).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-a', expectedServiceAccountId: 'account-id' }),
      expect.any(Function)
    );
    expect(fn).toHaveBeenCalledWith(accountRequest);
  });

  it("uses the request of the space's own account as it is", async () => {
    const { run, fn, serviceAccounts } = setup({
      boundAccountId: 'account-id',
      principal: { type: 'service_account', serviceAccountId: 'account-id' },
    });

    await expect(run()).resolves.toBe(request);
    expect(serviceAccounts.withScopedRequestForWorkload).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith(request);
  });

  it('refuses another service account with a 403', async () => {
    const { run, fn } = setup({
      boundAccountId: 'account-id',
      principal: { type: 'service_account', serviceAccountId: 'other-account' },
    });

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('assertCanChangeBoundWorkflows', () => {
  const run = async ({
    boundAccountId,
    canManageSecurity,
  }: {
    boundAccountId: string | undefined;
    canManageSecurity: boolean;
  }) => {
    const hasPrivileges = jest.fn(async () => ({ has_all_requested: canManageSecurity }));
    const core = {
      security: {
        serviceAccounts: {
          isEnabled: () => true,
          getWorkloadBinding: jest.fn(async () =>
            boundAccountId ? { serviceAccountId: boundAccountId } : undefined
          ),
        },
      },
      elasticsearch: {
        client: { asScoped: () => ({ asCurrentUser: { security: { hasPrivileges } } }) },
      },
    };
    const result = assertCanChangeBoundWorkflows({
      core: core as never,
      request,
      spaceId: 'space-a',
    });
    return { result, hasPrivileges };
  };

  it('lets a user with manage_security pause or resume a space that is set up', async () => {
    const { result, hasPrivileges } = await run({
      boundAccountId: 'account-id',
      canManageSecurity: true,
    });

    await expect(result).resolves.toBeUndefined();
    expect(hasPrivileges).toHaveBeenCalledWith({ cluster: ['manage_security'] });
  });

  it('refuses a user without manage_security with a 403 when the space is set up', async () => {
    const { result } = await run({ boundAccountId: 'account-id', canManageSecurity: false });

    await expect(result).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuses a space that is not set up with a 503, without asking for manage_security', async () => {
    const { result, hasPrivileges } = await run({
      boundAccountId: undefined,
      canManageSecurity: true,
    });

    await expect(result).rejects.toMatchObject({ statusCode: 503 });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });
});

describe('reassignRulesToAccount', () => {
  const setupRules = ({
    links,
    enabledStates,
    bulkUpdateApiKey,
  }: {
    links: string[];
    enabledStates: Array<[string, boolean]>;
    bulkUpdateApiKey: jest.Mock;
  }) => {
    const accountRequest = httpServerMock.createKibanaRequest();
    const core = {
      security: {
        serviceAccounts: {
          isEnabled: jest.fn(() => true),
          getWorkloadBinding: jest.fn(async () => ({ serviceAccountId: 'account-id' })),
          withScopedRequestForWorkload: jest.fn(
            async (_: unknown, fn: (scopedRequest: typeof accountRequest) => Promise<unknown>) =>
              fn(accountRequest)
          ),
        },
        authc: { getPrincipal: jest.fn(() => ({ type: 'user' })) },
      },
    };
    const alertingV2RulesClient = {
      bulkUpdateApiKey,
      bulkDisableRules: jest.fn(),
      bulkEnableRules: jest.fn(),
    };
    const getScopedClients = jest.fn(async () => ({
      getSignificantEventsAlertingContext: async () => ({
        rulesClient: { findRuleEnabledStates: jest.fn(async () => new Map(enabledStates)) },
        alertingV2RulesClient,
      }),
      getKnowledgeIndicatorClient: async () => ({
        getRuleBackedQueryLinks: async () => links.map((ruleId) => ({ rule_id: ruleId })),
      }),
    }));
    const run = () =>
      reassignRulesToAccount({
        core: core as never,
        spaceId: 'space-a',
        getScopedClients: getScopedClients as never,
      });
    return { run, alertingV2RulesClient, getScopedClients, accountRequest };
  };

  it('replaces the keys of the enabled rules as the account, and never switches a rule off', async () => {
    const { run, alertingV2RulesClient, getScopedClients, accountRequest } = setupRules({
      links: ['on-1', 'off', 'on-2', 'on-1'],
      enabledStates: [
        ['on-1', true],
        ['off', false],
        ['on-2', true],
      ],
      bulkUpdateApiKey: jest.fn(async () => ({ affected_count: 2, errors: [] })),
    });

    await expect(run()).resolves.toEqual({ reassigned: 2, failedIds: [] });

    expect(getScopedClients).toHaveBeenCalledWith({ request: accountRequest });
    expect(alertingV2RulesClient.bulkUpdateApiKey).toHaveBeenCalledWith({ ids: ['on-1', 'on-2'] });
    expect(alertingV2RulesClient.bulkDisableRules).not.toHaveBeenCalled();
    expect(alertingV2RulesClient.bulkEnableRules).not.toHaveBeenCalled();
  });

  it('reports a rule whose key could not be replaced, which is still on, so a retry picks it up', async () => {
    const { run } = setupRules({
      links: ['on-1', 'on-2'],
      enabledStates: [
        ['on-1', true],
        ['on-2', true],
      ],
      bulkUpdateApiKey: jest.fn(async () => ({
        affected_count: 1,
        errors: [{ id: 'on-2', error: { code: 'rule_running', message: 'The rule is running' } }],
      })),
    });

    await expect(run()).resolves.toEqual({ reassigned: 1, failedIds: ['on-2'] });
  });

  it('does nothing when no rule is enabled', async () => {
    const { run, alertingV2RulesClient } = setupRules({
      links: ['off'],
      enabledStates: [['off', false]],
      bulkUpdateApiKey: jest.fn(async () => ({ affected_count: 0, errors: [] })),
    });

    await expect(run()).resolves.toEqual({ reassigned: 0, failedIds: [] });
    expect(alertingV2RulesClient.bulkUpdateApiKey).not.toHaveBeenCalled();
  });
});
