/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { assertCanManageInvestigationQuotas, canManageInvestigationQuotas } from './privileges';

const createSecurity = (hasAllRequested: boolean) => {
  const security = securityMock.createStart();
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  security.authz.checkPrivilegesWithRequest.mockReturnValue({
    atSpace: jest.fn(),
    atSpaces: jest.fn(),
    globally,
  });
  return { security, globally };
};

describe('investigation quota privileges', () => {
  it('requires manage and configure in all spaces', async () => {
    const { security, globally } = createSecurity(true);

    await expect(
      canManageInvestigationQuotas({ request: httpServerMock.createKibanaRequest(), security })
    ).resolves.toBe(true);

    expect(globally).toHaveBeenCalledWith({
      kibana: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES.map((privilege) =>
        security.authz.actions.api.get(privilege)
      ),
    });
  });

  it('denies a caller without the privileges', async () => {
    const { security } = createSecurity(false);

    await expect(
      canManageInvestigationQuotas({ request: httpServerMock.createKibanaRequest(), security })
    ).resolves.toBe(false);
  });

  it('denies when privileges cannot be verified', async () => {
    await expect(
      canManageInvestigationQuotas({ request: httpServerMock.createKibanaRequest() })
    ).resolves.toBe(false);
  });

  it('refuses with a 403 without the privileges', async () => {
    const { security } = createSecurity(false);

    await expect(
      assertCanManageInvestigationQuotas({
        request: httpServerMock.createKibanaRequest(),
        security,
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });
});
