/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import { requestContextMock, requestMock } from '../../../detection_engine/routes/__mocks__';
import type { SiemRuleMigrationsClient } from '../siem_rule_migrations_service';
import { registerSiemRuleMigrationsDeleteRoute } from './delete';

describe('registerSiemRuleMigrationsDeleteRoute', () => {
  const migrationId = 'test-migration-id';
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let isMigrationRunning: jest.Mock;
  let deleteMigration: jest.Mock;
  let context: ReturnType<typeof requestContextMock.create>;

  const request = requestMock.create({
    method: 'delete',
    path: SIEM_RULE_MIGRATION_PATH,
    params: { migration_id: migrationId },
  });

  const callRoute = async () => {
    const route = router.versioned.getRoute('delete', SIEM_RULE_MIGRATION_PATH);
    await route.versions['1'].handler(
      requestContextMock.convertContext(context),
      request,
      response
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    response = httpServerMock.createResponseFactory();
    isMigrationRunning = jest.fn();
    deleteMigration = jest.fn().mockResolvedValue(undefined);

    const { clients, context: requestContext } = requestContextMock.createTools();
    context = requestContext;
    const { data, task } = clients.siemRuleMigrationsClient;
    context.securitySolution.getSiemRuleMigrationsClient.mockReturnValue({
      data: {
        ...data,
        migrations: {
          ...data.migrations,
          get: jest.fn().mockResolvedValue({ id: migrationId }),
        },
        deleteMigration,
      },
      task: { ...task, isMigrationRunning },
    } as unknown as SiemRuleMigrationsClient);

    registerSiemRuleMigrationsDeleteRoute(router, loggerMock.create());
  });

  it('returns 409 and does not delete when the migration is running', async () => {
    isMigrationRunning.mockReturnValue(true);

    await callRoute();

    expect(isMigrationRunning).toHaveBeenCalledWith(migrationId);
    expect(response.conflict).toHaveBeenCalledWith({
      body: 'A running migration cannot be deleted. Please stop the migration first and try again',
    });
    expect(deleteMigration).not.toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('deletes the migration when it is not running', async () => {
    isMigrationRunning.mockReturnValue(false);

    await callRoute();

    expect(deleteMigration).toHaveBeenCalledWith(migrationId);
    expect(response.ok).toHaveBeenCalled();
    expect(response.conflict).not.toHaveBeenCalled();
  });
});
