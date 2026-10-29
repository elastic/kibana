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
