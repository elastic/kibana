/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import {
  assertCanManageSignificantEvents,
  assertCanReadSignificantEvents,
  canReadSignificantEvents,
} from './assert_can_manage_significant_events';

describe('Nightshift privilege checks', () => {
  it('checks manage_nightshift to manage and read_nightshift to read', async () => {
    const request = httpServerMock.createKibanaRequest();
    const security = securityMock.createStart();
    const checkPrivileges = jest.fn(async () => ({ hasAllRequested: true }));
    security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    security.authz.actions.api.get = jest.fn((privilege: string) => `api:${privilege}`);
    const server = { security };

    await expect(assertCanManageSignificantEvents({ request, server })).resolves.toBeUndefined();
    await expect(canReadSignificantEvents({ request, server })).resolves.toBe(true);
    await expect(assertCanReadSignificantEvents({ request, server })).resolves.toBeUndefined();

    expect(security.authz.checkPrivilegesDynamicallyWithRequest).toHaveBeenCalledWith(request);
    expect(checkPrivileges).toHaveBeenNthCalledWith(1, {
      kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.manage}`],
    });
    expect(checkPrivileges).toHaveBeenNthCalledWith(2, {
      kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.read}`],
    });
    expect(checkPrivileges).toHaveBeenNthCalledWith(3, {
      kibana: [`api:${NIGHTSHIFT_API_PRIVILEGES.read}`],
    });
  });
});
