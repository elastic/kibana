/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import {
  createLookupsForMigrationId,
  createMacrosForMigrationId,
  deleteAllRuleMigrations,
  ruleMigrationRouteHelpersFactory,
  splunkRuleWithResources,
} from '../../../utils';
import { createConnector, deleteConnector } from '../../../../detections_response/utils/connectors';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getResoucesPerMigrationFromES,
  getRuleMigrationFromES,
  getRulesPerMigrationFromES,
} from '../../../utils/es_queries';

/**
 * This connector is created at runtime rather than relying on a preconfigured
 * fixture, because MKI projects do not accept `--xpack.actions.preconfigured`
 * as a Kibana server arg (it is an FTR-only mechanism). The apiUrl is
 * deliberately unreachable so every inference call fails at the network layer:
 * this test only needs a migration to reach `running` status, it must never
 * make a real (billable) LLM call.
 */
const MOCK_BEDROCK_CONNECTOR = {
  name: 'siem-migrations-mock-bedrock',
  connector_type_id: '.bedrock',
  config: {
    apiUrl: 'https://mock-bedrock.invalid.example.com',
  },
  secrets: {
    accessKey: 'mock-access-key',
    secret: 'mock-secret-key',
  },
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Delete API', () => {
    let migrationId: string;
    let connectorId: string;

    before(async () => {
      connectorId = await createConnector(supertest, MOCK_BEDROCK_CONNECTOR);
    });

    after(async () => {
      await deleteConnector(supertest, connectorId).expect(204);
    });

    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      const response = await ruleMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    describe('Happy path', () => {
      it('should delete existing migration without any issues', async () => {
        await ruleMigrationRoutes.delete({
          migrationId,
          expectStatusCode: 200,
        });

        await ruleMigrationRoutes.get({
          migrationId,
          expectStatusCode: 404,
        });
      });

      it('should delete migrations, rules and resources associated with the migration', async () => {
        await ruleMigrationRoutes.addRulesToMigration({
          migrationId,
          /** adding bulk rules so that deletion of all rules can be tested */
          payload: Array.from({ length: 40 }, () => splunkRuleWithResources),
        });

        await createMacrosForMigrationId({
          es,
          migrationId,
          count: 40,
        });

        await createLookupsForMigrationId({
          es,
          migrationId,
          count: 40,
        });

        let migrationsFromES = await getRuleMigrationFromES({
          es,
          migrationId,
        });
        expect(migrationsFromES.hits.hits).toHaveLength(1);

        let rulesFromES = await getRulesPerMigrationFromES({
          es,
          migrationId,
        });
        expect(rulesFromES.hits.hits).toHaveLength(40);

        let resourcesFromES = await getResoucesPerMigrationFromES({
          es,
          migrationId,
        });

        expect(resourcesFromES.hits.hits).toHaveLength(83);

        await ruleMigrationRoutes.delete({
          migrationId,
          expectStatusCode: 200,
        });

        rulesFromES = await getRulesPerMigrationFromES({
          es,
          migrationId,
        });

        expect(rulesFromES.hits.hits).toHaveLength(0);

        migrationsFromES = await getRuleMigrationFromES({
          es,
          migrationId,
        });
        expect(migrationsFromES.hits.hits).toHaveLength(0);

        resourcesFromES = await getResoucesPerMigrationFromES({
          es,
          migrationId,
        });
        expect(resourcesFromES.hits.hits).toHaveLength(0);
      });

      describe('Error handling', () => {
        it('should return 409 if migration is already running', async () => {
          await ruleMigrationRoutes.addRulesToMigration({
            migrationId,
            /** enough rules to keep the migration running while delete is attempted */
            payload: Array.from({ length: 40 }, () => splunkRuleWithResources),
          });

          const response = await ruleMigrationRoutes.start({
            migrationId,
            payload: {
              settings: {
                connector_id: connectorId,
              },
            },
          });

          expect(response.body).toMatchObject({ started: true });

          await pRetry(
            async () => {
              const statsResponse = await ruleMigrationRoutes.stats({ migrationId });
              if (statsResponse.body.status !== 'running') {
                throw new Error('Retry until migration is running');
              }
            },
            { retries: 5 }
          );

          /**
           * Committed regression guard: if this ever resolves back to a
           * hardcoded fixture id, this assertion fails loudly instead of the
           * test silently passing against the wrong connector.
           */
          const runningStats = await ruleMigrationRoutes.stats({ migrationId });
          expect(runningStats.body.last_execution?.connector_id).toEqual(connectorId);

          const deleteResponse = await ruleMigrationRoutes.delete({
            migrationId,
            expectStatusCode: 409,
          });

          expect(deleteResponse.body).toMatchObject({
            statusCode: 409,
            error: 'Conflict',
            message:
              'A running migration cannot be deleted. Please stop the migration first and try again',
          });

          /** this is the only test that leaves a migration running, stop it so it does not leak into the following tests */
          await ruleMigrationRoutes.stop({ migrationId });
        });

        it('should return 404 if migration ID does not exist', async () => {
          const { body } = await ruleMigrationRoutes.delete({
            migrationId: 'non-existing-migration-id',
            expectStatusCode: 404,
          });

          expect(body).toMatchObject({
            statusCode: 404,
            error: 'Not Found',
            message: 'No Migration found with id: non-existing-migration-id',
          });
        });
      });
    });
  });
};
