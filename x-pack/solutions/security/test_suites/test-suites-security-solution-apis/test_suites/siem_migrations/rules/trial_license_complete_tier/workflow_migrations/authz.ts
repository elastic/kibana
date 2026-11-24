/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import type { CustomRole } from '../../../../../config/services/types';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

const workflowMigrationReaderWithoutPrivilege: CustomRole = {
  name: 'workflow_migration_no_privilege',
  privileges: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const workflowMigrationUserWithoutWorkflows: CustomRole = {
  name: 'workflow_migration_without_workflows',
  privileges: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          [SIEM_MIGRATIONS_FEATURE_ID]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const workflowMigrationUserWithWorkflowsRead: CustomRole = {
  name: 'workflow_migration_with_workflows_read',
  privileges: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          [SIEM_MIGRATIONS_FEATURE_ID]: ['all'],
          workflowsManagement: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export default ({ getService }: FtrProviderContext) => {
  const securitySolutionUtils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA Workflow Migration API authorization', () => {
    after(async () => {
      await securitySolutionUtils.cleanUpCustomRoles();
    });

    it('denies every workflow migration endpoint without the SIEM migrations privilege', async () => {
      const supertest = await securitySolutionUtils.createSuperTestWithCustomRole(
        workflowMigrationReaderWithoutPrivilege
      );
      const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);
      const migrationId = 'missing-migration';

      await workflowMigrationRoutes.create({
        body: { name: 'Denied' },
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.get({ migrationId, expectStatusCode: 403 });
      await workflowMigrationRoutes.update({
        migrationId,
        body: { name: 'Denied' },
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.delete({ migrationId, expectStatusCode: 403 });
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.getWorkflows({ migrationId, expectStatusCode: 403 });
    });

    it('denies every workflow migration endpoint without the Workflows read privilege', async () => {
      const supertest = await securitySolutionUtils.createSuperTestWithCustomRole(
        workflowMigrationUserWithoutWorkflows
      );
      const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);
      const migrationId = 'missing-migration';

      await workflowMigrationRoutes.create({
        body: { name: 'Denied' },
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.get({ migrationId, expectStatusCode: 403 });
      await workflowMigrationRoutes.update({
        migrationId,
        body: { name: 'Denied' },
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.delete({ migrationId, expectStatusCode: 403 });
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
        expectStatusCode: 403,
      });
      await workflowMigrationRoutes.getWorkflows({ migrationId, expectStatusCode: 403 });
    });

    it('allows workflow migration endpoints with the SIEM migrations and Workflows read privileges', async () => {
      const supertest = await securitySolutionUtils.createSuperTestWithCustomRole(
        workflowMigrationUserWithWorkflowsRead
      );
      const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

      await workflowMigrationRoutes.create({
        body: { name: 'Allowed' },
        expectStatusCode: 200,
      });
      await workflowMigrationRoutes.get({
        migrationId: 'missing-migration',
        expectStatusCode: 404,
      });
    });
  });
};
