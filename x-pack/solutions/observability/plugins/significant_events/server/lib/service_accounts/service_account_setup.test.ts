/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createDetectionEngineSetupService } from './service_account_setup';

const request = httpServerMock.createKibanaRequest();

const createCore = ({
  enabled = true,
  canManageSecurity = true,
  roleCount = 1,
}: {
  enabled?: boolean;
  canManageSecurity?: boolean;
  roleCount?: number;
} = {}) => {
  const bindWorkload = jest.fn(async () => ({}));
  const queryRole = jest.fn(async () => ({ total: roleCount }));
  const core = {
    security: {
      serviceAccounts: { isEnabled: () => enabled, bindWorkload, getWorkloadBinding: jest.fn() },
    },
    elasticsearch: {
      client: {
        asScoped: () => ({
          asCurrentUser: {
            security: {
              hasPrivileges: async () => ({ has_all_requested: canManageSecurity }),
              queryRole,
            },
          },
        }),
      },
    },
  } as unknown as CoreStart;
  return { core, bindWorkload, queryRole };
};

describe('createDetectionEngineSetupService.enable', () => {
  it('binds the given account to the space, after checking the Serverless role exists', async () => {
    const { core, bindWorkload, queryRole } = createCore();

    const result = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      isServerless: true,
    }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' });

    expect(result).toEqual({ spaceId: 'default', serviceAccountId: 'account-1' });
    expect(queryRole).toHaveBeenCalledWith({
      query: { term: { name: '_nightshift_detection' } },
      size: 1,
    });
    expect(bindWorkload).toHaveBeenCalledWith(request, {
      serviceAccountId: 'account-1',
      workloadType: 'detection_engine',
      workloadId: 'detection_engine',
    });
  });

  it('refuses with 403 without manage_security, binding nothing', async () => {
    const { core, bindWorkload } = createCore({ canManageSecurity: false });

    await expect(
      createDetectionEngineSetupService({ core, spaces: undefined, isServerless: false }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 400 when the role of the account does not exist, binding nothing', async () => {
    const { core, bindWorkload } = createCore({ roleCount: 0 });

    await expect(
      createDetectionEngineSetupService({ core, spaces: undefined, isServerless: false }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('[nightshift_detection]'),
    });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 400 when service accounts are off', async () => {
    const { core, bindWorkload } = createCore({ enabled: false });

    await expect(
      createDetectionEngineSetupService({ core, spaces: undefined, isServerless: false }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });
});
