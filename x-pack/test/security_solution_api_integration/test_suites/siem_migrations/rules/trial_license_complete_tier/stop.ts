/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { defaultOriginalRule, migrationRulesRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);

  describe('Stop Migration', () => {
    let migrationId: string;
    beforeEach(async () => {
      migrationId = uuidv4();
      await migrationRulesRoutes.create({
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
