/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
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
    it.only('should stop a running migration successfully', async () => {
      // start migration
      const { body } = await migrationRulesRoutes.start({
        migrationId,
        payload: {
          connector_id: 'preconfigured-bedrock',
        },
      });
      expect(body).to.eql({ started: true });

      // check if it running correctly
      let statsResponse = await migrationRulesRoutes.stats({ migrationId });
      expect(statsResponse.body.status).to.eql('running');

      // Stop Migration
      const response = await migrationRulesRoutes.stop({ migrationId });
      expect(response.body).to.eql({ stopped: true });

      // check if the migration is stopped
      statsResponse = await migrationRulesRoutes.stats({ migrationId });
      expect(statsResponse.body.status).to.eql('ready');
    });

    it('should return correct status of an aborted migration', async () => {
      // start migration
      const { body } = await migrationRulesRoutes.start({
        migrationId,
        payload: {
          connector_id: 'preconfigured-bedrock',
        },
      });
      expect(body).to.eql({ started: true });

      // check if it running correctly
      let statsResponse = await migrationRulesRoutes.stats({ migrationId });
      expect(statsResponse.body.status).to.eql('running');

      while (true) {
        const migrationResponse = await migrationRulesRoutes.get({ migrationId });
        console.log(JSON.stringify({ migrationResponse: migrationResponse.body }, null, 2));
        if (!migrationResponse.body?.last_execution?.started_at) {
          // wait for the migration to start
          console.log('Waiting for migration to start...');
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        break;
      }

      // await new Promise((resolve) => setTimeout(resolve, 5000));

      // Stop Migration
      const response = await migrationRulesRoutes.stop({ migrationId });
      expect(response.body).to.eql({ stopped: true });

      // check if the migration is stopped
      statsResponse = await migrationRulesRoutes.stats({ migrationId });
      expect(statsResponse.body.status).to.eql('ready');
      const migrationResponse = await migrationRulesRoutes.get({ migrationId });
      console.log(JSON.stringify({ migrationResponse }, null, 2));
      expect(migrationResponse.body.last_execution.is_aborted).to.eql(true);
    });
    describe('error scenarios', () => {
      it('should return 404 if migration id is invalid and non-existent', async () => {
        await migrationRulesRoutes.start({
          migrationId: 'invalid_migration_id',
          expectStatusCode: 404,
          payload: { connector_id: 'preconfigured-bedrock' },
        });
      });

      it('should return correct output when migration is not even running', async () => {
        const stopResponse = await migrationRulesRoutes.stop({ migrationId });

        expect(stopResponse.body).to.eql({ stopped: true });
      });
    });
  });
};
