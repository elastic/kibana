/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DetectionAccountService } from './detection_account';

const SPACE_ID = 'default';
const ACCOUNT_ID = 'account-1';

type Principal = { type: 'user' } | { type: 'service_account'; serviceAccountId: string };

function createService({
  boundAccountId,
  bindingError,
  principal,
}: {
  boundAccountId?: string;
  bindingError?: Error;
  principal?: Principal;
}) {
  const withScopedRequestForWorkload = jest.fn(
    (_params: unknown, fn: (request: KibanaRequest) => Promise<unknown>) =>
      fn(httpServerMock.createKibanaRequest())
  );
  const security = {
    serviceAccounts: {
      isEnabled: () => true,
      getWorkloadBinding: jest.fn(async () => {
        if (bindingError) {
          throw bindingError;
        }
        return boundAccountId ? { serviceAccountId: boundAccountId } : null;
      }),
      withScopedRequestForWorkload,
    },
    authc: { getPrincipal: () => principal },
  } as unknown as CoreStart['security'];

  return {
    service: new DetectionAccountService(security, {} as CoreStart['elasticsearch']),
    withScopedRequestForWorkload,
  };
}

describe('DetectionAccountService', () => {
  const fn = jest.fn(async (request: KibanaRequest) => request);

  beforeEach(() => fn.mockClear());

  describe('getDetectionEngineAccountId', () => {
    it('reads a binding that fails the integrity check (403) as not set up, so it can be replaced', async () => {
      const { service } = createService({ bindingError: Boom.forbidden('integrity check failed') });

      await expect(service.getDetectionEngineAccountId({ spaceId: SPACE_ID })).resolves.toBe(
        undefined
      );
    });

    it('rethrows any other failure', async () => {
      const { service } = createService({ bindingError: Boom.badImplementation('boom') });

      await expect(service.getDetectionEngineAccountId({ spaceId: SPACE_ID })).rejects.toThrow(
        'boom'
      );
    });
  });

  describe('asDetectionEngineAccount', () => {
    it('refuses with 503 when the space is not set up', async () => {
      const { service, withScopedRequestForWorkload } = createService({});

      await expect(
        service.asDetectionEngineAccount({
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

    it('swaps a user request for one authenticated as the account, pinned to the bound account', async () => {
      const { service, withScopedRequestForWorkload } = createService({
        boundAccountId: ACCOUNT_ID,
        principal: { type: 'user' },
      });

      await service.asDetectionEngineAccount({
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
      const { service, withScopedRequestForWorkload } = createService({
        boundAccountId: ACCOUNT_ID,
        principal: { type: 'service_account', serviceAccountId: ACCOUNT_ID },
      });
      const request = httpServerMock.createKibanaRequest();

      expect(await service.asDetectionEngineAccount({ request, spaceId: SPACE_ID, fn })).toBe(
        request
      );
      expect(withScopedRequestForWorkload).not.toHaveBeenCalled();
    });

    it('refuses with 403 a service account other than the space account', async () => {
      const { service } = createService({
        boundAccountId: ACCOUNT_ID,
        principal: { type: 'service_account', serviceAccountId: 'other' },
      });

      await expect(
        service.asDetectionEngineAccount({
          request: httpServerMock.createKibanaRequest(),
          spaceId: SPACE_ID,
          fn,
        })
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
