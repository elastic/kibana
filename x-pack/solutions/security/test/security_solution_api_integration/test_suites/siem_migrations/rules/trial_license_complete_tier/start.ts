/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  SiemMigrationsAPIErrorResponse,
  defaultOriginalRule,
  ruleMigrationRouteHelpersFactory,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('Start Migration', () => {
    let migrationId: string;
    beforeEach(async () => {
      const createMigrationRespose = await migrationRulesRoutes.create({});
      migrationId = createMigrationRespose.body.migration_id;
      await migrationRulesRoutes.addRulesToMigration({
        migrationId,
        payload: [defaultOriginalRule],
      });
    });

    afterEach(async () => {
      await migrationRulesRoutes.stop({ migrationId });
    });
    it('should start migration successfully with default settings', async () => {
      const response = await migrationRulesRoutes.start({
        migrationId,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
          },
        },
      });

      expect(response.body).to.eql({ started: true });

      // Make sure the started_at is populated
      const migrationResponse = await migrationRulesRoutes.get({ migrationId });
      expect(migrationResponse.body?.last_execution?.started_at).to.be.ok();
      expect(migrationResponse.body?.last_execution?.connector_id).to.eql('preconfigured-bedrock');
      expect(migrationResponse.body?.last_execution?.skip_prebuilt_rules_matching).to.be(false);
    });

    it('should start migration successfully with custom settings', async () => {
      const response = await migrationRulesRoutes.start({
        migrationId,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
            skip_prebuilt_rules_matching: true,
          },
        },
      });

      expect(response.body).to.eql({ started: true });

      // Make sure the started_at is populated
      const migrationResponse = await migrationRulesRoutes.get({ migrationId });
      expect(migrationResponse.body?.last_execution?.started_at).to.be.ok();
      expect(migrationResponse.body?.last_execution?.skip_prebuilt_rules_matching).to.be(true);
    });

    it('should return status of running migration correctly ', async () => {
      await migrationRulesRoutes.start({
        migrationId,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
          },
        },
      });

      const response = await migrationRulesRoutes.stats({ migrationId });

      expect(response.body).keys('status', 'rules', 'id', 'created_at', 'last_updated_at');

      expect(response.body.rules).to.eql({
        completed: 0,
        failed: 0,
        pending: 1,
        processing: 0,
        total: 1,
      });

      expect(response.body.status).to.equal('running');
      expect(response.body.id).to.equal(migrationId);
    });

    it('should return started false for already running migration', async () => {
      await migrationRulesRoutes.start({
        migrationId,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
          },
        },
      });

      const response = await migrationRulesRoutes.start({
        migrationId,
        expectStatusCode: 200,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
          },
        },
      });

      expect(response.body).to.eql({ started: false });
    });

    describe('error scenarios', () => {
      it('should reject if connector_id is incorrect', async () => {
        const response = await migrationRulesRoutes.start({
          migrationId,
          expectStatusCode: 500,
          payload: {
            settings: {
              connector_id: 'preconfigured_bedrock',
            },
          },
        });

        expect((response.body as unknown as SiemMigrationsAPIErrorResponse).message).to.eql(
          'Saved object [action/preconfigured_bedrock] not found'
        );
      });

      it('should reject if connector_id is not provided', async () => {
        const response = await migrationRulesRoutes.start({
          migrationId,
          expectStatusCode: 400,
          payload: {
            settings: {
              // @ts-expect-error
              connector_id: undefined,
            },
          },
        });
        expect((response.body as unknown as SiemMigrationsAPIErrorResponse).message).to.eql(
          '[request body]: settings.connector_id: Required'
        );
      });

      it('should reject with 404 if migrationId is not found', async () => {
        await migrationRulesRoutes.start({
          migrationId: 'invalid_migration_id',
          expectStatusCode: 404,
          payload: {
            settings: {
              connector_id: 'preconfigured-bedrock',
            },
          },
        });
      });

      it('should reject with 404 if migrationId is not provided', async () => {
        // @ts-expect-error
        const response = await migrationRulesRoutes.start({
          expectStatusCode: 404,
          payload: {
            settings: {
              connector_id: 'preconfigured-bedrock',
            },
          },
        });

        expect((response.body as unknown as SiemMigrationsAPIErrorResponse).message).to.eql(
          'No Migration found with id: undefined'
        );
      });
    });
  });
};
