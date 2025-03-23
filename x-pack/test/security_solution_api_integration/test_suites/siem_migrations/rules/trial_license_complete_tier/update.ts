/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import {
  createMigrationRules,
  deleteAllMigrationRules,
  getMigrationRuleDocument,
  migrationRulesRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Update API', () => {
    beforeEach(async () => {
      await deleteAllMigrationRules(es);
    });

    describe('Happy path', () => {
      it('should update migration rules', async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        const [createdDocumentId] = await createMigrationRules(es, [migrationRuleDocument]);

        const now = new Date().toISOString();
        await migrationRulesRoutes.update({
          migrationId,
          payload: [
            {
              id: createdDocumentId,
              elastic_rule: { title: 'Updated title' },
              comments: [{ message: 'Update comment', created_by: 'ftr test', created_at: now }],
            },
          ],
        });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);

        const {
          '@timestamp': timestamp,
          updated_at: updatedAt,
          updated_by: updatedBy,
          elastic_rule: elasticRule,
          ...rest
        } = migrationRuleDocument;

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(
          expect.objectContaining({
            ...rest,
            elastic_rule: { ...elasticRule, title: 'Updated title' },
            comments: [{ message: 'Update comment', created_by: 'ftr test', created_at: now }],
          })
        );
      });

      it('should ignore attributes that are not eligible for update', async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        const [createdDocumentId] = await createMigrationRules(es, [migrationRuleDocument]);

        const now = new Date().toISOString();
        await migrationRulesRoutes.update({
          migrationId,
          payload: [
            {
              id: createdDocumentId,
              elastic_rule: { title: 'Updated title' },
              comments: [{ message: 'Update comment', created_by: 'ftr test', created_at: now }],
              // Should be ignored
              migration_id: 'fake_migration_id_1',
              original_rule: { description: 'Ignore this description' },
              translation_result: 'ignore this translation result',
              status: 'ignore this status',
            },
          ],
        });

        const {
          '@timestamp': timestamp,
          updated_at: updatedAt,
          updated_by: updatedBy,
          elastic_rule: elasticRule,
          ...rest
        } = migrationRuleDocument;
        const expectedMigrationRule = expect.objectContaining({
          ...rest,
          elastic_rule: { ...elasticRule, title: 'Updated title' },
          comments: [{ message: 'Update comment', created_by: 'ftr test', created_at: now }],
        });

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(expectedMigrationRule);
      });
    });

    describe('Error handling', () => {
      it('should return empty content response when no rules passed', async () => {
        const migrationId = uuidv4();
        await migrationRulesRoutes.update({
          migrationId,
          payload: [],
          expectStatusCode: 204,
        });
      });

      it(`should return an error when rule's id is not specified`, async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);

        const response = await migrationRulesRoutes.update({
          migrationId,
          payload: [{ elastic_rule: { title: 'Updated title' } }],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          error: 'Bad Request',
          message: '[request body]: 0.id: Required',
          statusCode: 400,
        });
      });

      it(`should return an error when undefined payload has been passed`, async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);

        const response = await migrationRulesRoutes.update({
          migrationId,
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          error: 'Bad Request',
          message: '[request body]: Expected array, received null',
          statusCode: 400,
        });
      });
    });
  });
};
