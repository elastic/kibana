/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import pRetry from 'p-retry';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { defaultOriginalRule, ruleMigrationRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('Stop Migration', () => {
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
    it('should stop a running migration successfully', async () => {
      // start migration
      const { body } = await migrationRulesRoutes.start({
        migrationId,
        payload: {
          settings: {
            connector_id: 'preconfigured-bedrock',
          },
        },
      });
      expect(body).to.eql({ started: true });

      // check if it running correctly
      const statsResponse = await migrationRulesRoutes.stats({ migrationId });
      expect(statsResponse.body.status).to.eql('running');

      // Stop Migration
      const response = await migrationRulesRoutes.stop({ migrationId });
      expect(response.body).to.eql({ stopped: true });

      await pRetry(
        async () => {
          const currentStatsResponse = await migrationRulesRoutes.stats({ migrationId });
          if (currentStatsResponse.body.status !== 'stopped') {
            throw new Error('Retry until migration is stopped');
          }
          return currentStatsResponse;
        },
        {
          retries: 3,
        }
      );

      const migrationResponse = await migrationRulesRoutes.get({ migrationId });
      expect(migrationResponse.body?.last_execution?.is_stopped).to.eql(true);
      expect(migrationResponse.body?.last_execution?.finished_at).to.be.ok();
    });

    describe('error scenarios', () => {
      it('should return 404 if migration id is invalid and non-existent', async () => {
        await migrationRulesRoutes.start({
          migrationId: 'invalid_migration_id',
          expectStatusCode: 404,
          payload: { settings: { connector_id: 'preconfigured-bedrock' } },
        });
      });

      it('should return correct output when migration is not even running', async () => {
        const stopResponse = await migrationRulesRoutes.stop({ migrationId });

        expect(stopResponse.body).to.eql({ stopped: true });
      });
    });
  });
};
