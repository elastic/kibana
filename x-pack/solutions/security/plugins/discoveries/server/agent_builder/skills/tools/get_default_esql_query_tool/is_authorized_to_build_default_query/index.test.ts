/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { DEFAULT_ESQL_QUERY_REQUIRED_API_PRIVILEGES, isAuthorizedToBuildDefaultQuery } from '.';

const createAuthz = (hasAllRequested: boolean) => {
  const atSpace = jest.fn().mockResolvedValue({ hasAllRequested, privileges: { kibana: [] } });
  const checkPrivilegesWithRequest = jest.fn().mockReturnValue({ atSpace });

  return {
    atSpace,
    authz: {
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesWithRequest,
    } as unknown as SecurityPluginStart['authz'],
    checkPrivilegesWithRequest,
  };
};

describe('isAuthorizedToBuildDefaultQuery', () => {
  const request = {} as unknown as KibanaRequest;

  it('returns true when every required privilege is held', async () => {
    const { authz } = createAuthz(true);

    await expect(
      isAuthorizedToBuildDefaultQuery({ authz, request, spaceId: 'default' })
    ).resolves.toBe(true);
  });

  it('returns false when a required privilege is missing', async () => {
    const { authz } = createAuthz(false);

    await expect(
      isAuthorizedToBuildDefaultQuery({ authz, request, spaceId: 'default' })
    ).resolves.toBe(false);
  });

  it('checks the request, the space and all required API privileges', async () => {
    const { atSpace, authz, checkPrivilegesWithRequest } = createAuthz(true);

    await isAuthorizedToBuildDefaultQuery({ authz, request, spaceId: 'my-space' });

    expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(atSpace).toHaveBeenCalledWith('my-space', {
      kibana: DEFAULT_ESQL_QUERY_REQUIRED_API_PRIVILEGES.map((privilege) => `api:${privilege}`),
    });
  });
});
