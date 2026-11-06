/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  asDetectionEngineAccount,
  assertServiceAccountActsForSpace,
  getDetectionEngineAccountId,
  isDetectionEngineSetUp,
} from './detection_engine_account';

const SPACE_ID = 'default';
const ACCOUNT_ID = 'account-1';

const createCore = ({
  enabled = true,
  boundAccountId,
  principal,
}: {
  enabled?: boolean;
  boundAccountId?: string;
  principal?: { type: 'user' } | { type: 'service_account'; serviceAccountId: string };
}) => {
  const withScopedRequestForWorkload = jest.fn(
    (_params: unknown, fn: (request: KibanaRequest) => Promise<unknown>) =>
      fn(httpServerMock.createKibanaRequest())
  );
  const getWorkloadBinding = jest.fn(async () =>
    boundAccountId ? { serviceAccountId: boundAccountId } : null
  );
  const core = {
    security: {
      serviceAccounts: {
        isEnabled: () => enabled,
        getWorkloadBinding,
        withScopedRequestForWorkload,
      },
      authc: { getPrincipal: () => principal },
    },
  } as unknown as CoreStart;
  return { core, getWorkloadBinding, withScopedRequestForWorkload };
};

describe('getDetectionEngineAccountId', () => {
  it('reads no binding when service accounts are off', async () => {
    const { core, getWorkloadBinding } = createCore({ enabled: false, boundAccountId: ACCOUNT_ID });

    expect(await getDetectionEngineAccountId({ core, spaceId: SPACE_ID })).toBeUndefined();
    expect(getWorkloadBinding).not.toHaveBeenCalled();
  });

  it('reads the account bound to the space', async () => {
    const { core } = createCore({ boundAccountId: ACCOUNT_ID });

    expect(await isDetectionEngineSetUp({ core, spaceId: SPACE_ID })).toBe(true);
  });
});

describe('asDetectionEngineAccount', () => {
  const fn = jest.fn(async (request: KibanaRequest) => request);

  beforeEach(() => fn.mockClear());

  it('refuses with 503 when the space is not set up', async () => {
    const { core, withScopedRequestForWorkload } = createCore({});

    await expect(
      asDetectionEngineAccount({
        core,
        request: httpServerMock.createKibanaRequest(),
        spaceId: SPACE_ID,
        fn,
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('Nightshift is not set up in this space'),
    });
    expect(withScopedRequestForWorkload).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it('says service accounts are disabled when they are off, not to call _enable', async () => {
    const { core } = createCore({ enabled: false });

    await expect(
      asDetectionEngineAccount({
        core,
        request: httpServerMock.createKibanaRequest(),
        spaceId: SPACE_ID,
        fn,
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('service accounts are disabled'),
    });
  });

  it('swaps a user request for one authenticated as the account, pinned to the bound account', async () => {
    const { core, withScopedRequestForWorkload } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'user' },
    });

    await asDetectionEngineAccount({
      core,
      request: httpServerMock.createKibanaRequest(),
      spaceId: SPACE_ID,
      fn,
    });

    expect(withScopedRequestForWorkload).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: SPACE_ID, expectedServiceAccountId: ACCOUNT_ID }),
      fn
    );
  });

  it('uses the request of the space account as it is', async () => {
    const { core, withScopedRequestForWorkload } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'service_account', serviceAccountId: ACCOUNT_ID },
    });
    const request = httpServerMock.createKibanaRequest();

    expect(await asDetectionEngineAccount({ core, request, spaceId: SPACE_ID, fn })).toBe(request);
    expect(withScopedRequestForWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 403 a service account other than the space account', async () => {
    const { core } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'service_account', serviceAccountId: 'other' },
    });

    await expect(
      asDetectionEngineAccount({
        core,
        request: httpServerMock.createKibanaRequest(),
        spaceId: SPACE_ID,
        fn,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('assertServiceAccountActsForSpace', () => {
  const run = (core: CoreStart) =>
    assertServiceAccountActsForSpace({
      core,
      request: httpServerMock.createKibanaRequest(),
      spaceId: SPACE_ID,
    });

  it('lets the space account through', async () => {
    const { core } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'service_account', serviceAccountId: ACCOUNT_ID },
    });

    await expect(run(core)).resolves.toBeUndefined();
  });

  it('refuses with 403 the account of another space', async () => {
    const { core } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'service_account', serviceAccountId: 'account-of-another-space' },
    });

    await expect(run(core)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuses with 503 every service account in a space that is not set up', async () => {
    const { core } = createCore({
      principal: { type: 'service_account', serviceAccountId: ACCOUNT_ID },
    });

    await expect(run(core)).rejects.toMatchObject({ statusCode: 503 });
  });

  it('does not hold a user to the space account', async () => {
    const { core, getWorkloadBinding } = createCore({
      boundAccountId: ACCOUNT_ID,
      principal: { type: 'user' },
    });

    await expect(run(core)).resolves.toBeUndefined();
    expect(getWorkloadBinding).not.toHaveBeenCalled();
  });
});
