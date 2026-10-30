/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { RegisteredVersionedRoute } from '@kbn/core-http-router-server-mocks';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import {
  requestContextMock,
  requestMock,
  responseMock,
} from '../../../detection_engine/routes/__mocks__';
import { registerSiemRuleMigrationsDeleteRoute } from './delete';

const migrationId = 'test-migration-id';

describe('registerSiemRuleMigrationsDeleteRoute', () => {
  let clients: ReturnType<typeof requestContextMock.createTools>['clients'];
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let response: ReturnType<typeof responseMock.create>;
  let handler: RegisteredVersionedRoute['versions'][string]['handler'];

  const request = requestMock.create({
    method: 'delete',
    path: SIEM_RULE_MIGRATION_PATH,
    params: { migration_id: migrationId },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clients = requestContextMock.createTools().clients;
    context = requestContextMock.convertContext(requestContextMock.create(clients));
    response = responseMock.create();
    clients.siemRuleMigrationsClient.data.migrations.get.mockResolvedValue({ id: migrationId });

    const router = httpServiceMock.createRouter();
    registerSiemRuleMigrationsDeleteRoute(router, loggerMock.create());
    handler = Object.values(
      router.versioned.getRoute('delete', SIEM_RULE_MIGRATION_PATH).versions
    )[0].handler;
  });

  describe('when the migration is running', () => {
    beforeEach(() => {
      clients.siemRuleMigrationsClient.task.isMigrationRunning.mockReturnValue(true);
    });

    it('returns a conflict error without deleting the migration', async () => {
      await handler(context, request, response);

      expect(response.conflict).toHaveBeenCalledWith({
        body: 'A running migration cannot be deleted. Please stop the migration first and try again',
      });
      expect(clients.siemRuleMigrationsClient.data.deleteMigration).not.toHaveBeenCalled();
    });
  });

  describe('when the migration is not running', () => {
    beforeEach(() => {
      clients.siemRuleMigrationsClient.task.isMigrationRunning.mockReturnValue(false);
    });

    it('deletes the migration', async () => {
      await handler(context, request, response);

      expect(clients.siemRuleMigrationsClient.data.deleteMigration).toHaveBeenCalledWith(
        migrationId
      );
      expect(response.ok).toHaveBeenCalled();
      expect(response.conflict).not.toHaveBeenCalled();
    });
  });
});
