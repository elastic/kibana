/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { canManageSessionsInAllSpaces } from './manage_sessions_privilege';

const authzWith = ({ rbac, hasAllRequested }: { rbac: boolean; hasAllRequested: boolean }) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  const authz = {
    mode: { useRbacForRequest: () => rbac },
    actions: { api: { get: (operation: string) => `api:${operation}` } },
    checkPrivilegesWithRequest: jest.fn(() => ({ globally })),
  } as unknown as AuthorizationServiceSetup;
  return { authz, globally };
};

describe('canManageSessionsInAllSpaces', () => {
  const request = httpServerMock.createKibanaRequest();

  it.each([true, false])(
    'checks the manage sessions privilege across spaces (granted: %s)',
    async (hasAllRequested) => {
      const { authz, globally } = authzWith({ rbac: true, hasAllRequested });

      expect(await canManageSessionsInAllSpaces(authz, request)).toBe(hasAllRequested);
      expect(authz.checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(globally).toHaveBeenCalledWith({
        kibana: ['api:manage_digital_experience_sessions'],
      });
    }
  );

  it('denies it without checking when the route found it missing in this space', async () => {
    const { authz, globally } = authzWith({ rbac: true, hasAllRequested: true });
    const spaceRequest = Object.assign(httpServerMock.createKibanaRequest(), {
      authzResult: { manage_digital_experience_sessions: false },
    });

    expect(await canManageSessionsInAllSpaces(authz, spaceRequest)).toBe(false);
    expect(globally).not.toHaveBeenCalled();
  });

  it('allows it without RBAC, as the routes check no Kibana privileges then', async () => {
    const { authz, globally } = authzWith({ rbac: false, hasAllRequested: false });

    expect(await canManageSessionsInAllSpaces(authz, request)).toBe(true);
    expect(await canManageSessionsInAllSpaces(undefined, request)).toBe(true);
    expect(globally).not.toHaveBeenCalled();
  });
});
