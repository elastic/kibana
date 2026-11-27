/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SecurityException } from '../../errors';
import { assertSloGlobalAdmin } from './assert_slo_global_admin';

describe('assertSloGlobalAdmin', () => {
  const request = httpServerMock.createKibanaRequest();

  const setup = ({ useRbac, hasAllRequested }: { useRbac: boolean; hasAllRequested: boolean }) => {
    const { authz } = securityMock.createSetup();
    authz.mode.useRbacForRequest.mockReturnValue(useRbac);
    jest.mocked(authz.actions.api.get).mockImplementation((operation) => `api:${operation}`);
    const globally = jest.fn().mockResolvedValue({ hasAllRequested });
    authz.checkPrivilegesWithRequest.mockReturnValue({ globally });
    return { authz, globally };
  };

  it('allows the request when RBAC does not apply to it', async () => {
    const { authz, globally } = setup({ useRbac: false, hasAllRequested: false });

    await expect(assertSloGlobalAdmin({ authz, request })).resolves.toBeUndefined();
    expect(globally).not.toHaveBeenCalled();
  });

  it('allows a user with the SLO write privilege in all spaces', async () => {
    const { authz, globally } = setup({ useRbac: true, hasAllRequested: true });

    await expect(assertSloGlobalAdmin({ authz, request })).resolves.toBeUndefined();
    expect(authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(globally).toHaveBeenCalledWith({ kibana: ['api:slo_write'] });
  });

  it('rejects a user without the SLO write privilege in all spaces', async () => {
    const { authz } = setup({ useRbac: true, hasAllRequested: false });

    await expect(assertSloGlobalAdmin({ authz, request })).rejects.toBeInstanceOf(
      SecurityException
    );
  });
});
