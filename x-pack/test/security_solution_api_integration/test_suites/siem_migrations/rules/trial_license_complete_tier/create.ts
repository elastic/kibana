/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { SiemMigrationStatus } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import {
  defaultOriginalRule,
  deleteAllMigrationRules,
  migrationResourcesRouteHelpersFactory,
  migrationRulesRouteHelpersFactory,
  splunkRuleWithResources,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);
  const migrationResourcesRoutes = migrationResourcesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Create API', () => {
    beforeEach(async () => {
      await deleteAllMigrationRules(es);
    });

    describe('Happy path', () => {
      it('should create migrations with provided id', async () => {
        const migrationId = uuidv4();
        await migrationRulesRoutes.create({ migrationId, payload: [defaultOriginalRule] });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(
          expect.objectContaining({
            migration_id: migrationId,
            original_rule: defaultOriginalRule,
            status: SiemMigrationStatus.PENDING,
          })
        );
      });

      it('should create migrations without provided id', async () => {
        const {
          body: { migration_id: migrationId },
        } = await migrationRulesRoutes.create({ payload: [defaultOriginalRule] });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(
          expect.objectContaining({
            migration_id: migrationId,
            original_rule: defaultOriginalRule,
            status: SiemMigrationStatus.PENDING,
          })
        );
      });

      it('should create migrations with the rules that have resources', async () => {
        const migrationId = uuidv4();
        await migrationRulesRoutes.create({ migrationId, payload: [splunkRuleWithResources] });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(
          expect.objectContaining({
            migration_id: migrationId,
            original_rule: splunkRuleWithResources,
            status: SiemMigrationStatus.PENDING,
          })
        );

        // fetch missing resources
        const resourcesResponse = await migrationResourcesRoutes.getMissingResources({
          migrationId,
        });
        expect(resourcesResponse.body).toEqual([
          { type: 'macro', name: 'summariesonly' },
          { type: 'macro', name: 'drop_dm_object_name(1)' },
          { type: 'lookup', name: 'malware_tracker' },
        ]);
      });
    });

    describe('Error handling', () => {
      it('should return no content error', async () => {
        const migrationId = uuidv4();
        await migrationRulesRoutes.create({ migrationId, payload: [], expectStatusCode: 204 });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(0);
      });

      it(`should return an error when undefined payload has been passed`, async () => {
        const migrationId = uuidv4();
        const response = await migrationRulesRoutes.create({ migrationId, expectStatusCode: 400 });

        expect(response.body).toEqual({
          error: 'Bad Request',
          message: '[request body]: Expected array, received null',
          statusCode: 400,
        });
      });

      it('should return an error when original rule id is not specified', async () => {
        const { id, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.id: Required',
        });
      });

      it('should return an error when original rule vendor is not specified', async () => {
        const { vendor, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.vendor: Invalid literal value, expected "splunk"',
        });
      });

      it('should return an error when original rule title is not specified', async () => {
        const { title, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.title: Required',
        });
      });

      it('should return an error when original rule description is not specified', async () => {
        const { description, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.description: Required',
        });
      });

      it('should return an error when original rule query is not specified', async () => {
        const { query, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.query: Required',
        });
      });

      it('should return an error when original rule query_language is not specified', async () => {
        const { query_language: _, ...restOfOriginalRule } = defaultOriginalRule;
        const response = await migrationRulesRoutes.create({
          payload: [restOfOriginalRule],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: 0.query_language: Required',
        });
      });
    });
  });
};
