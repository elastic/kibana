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
  deleteAllRuleMigrations,
  getMigrationRuleDocuments,
  ruleMigrationRouteHelpersFactory,
  statsOverrideCallbackFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Stats API', () => {
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
    });

    it('should return stats for the specific migration', async () => {
      const migrationId = uuidv4();

      const failed = 3;
      const pending = 5;
      const processing = 7;
      const completed = 10;
      const total = failed + pending + processing + completed;
      const overrideCallback = statsOverrideCallbackFactory({
        migrationId,
        failed,
        pending,
        processing,
        completed, // 4 - full, 5 - partial, 1 - untranslated
        fullyTranslated: 4,
        partiallyTranslated: 5,
      });
      const migrationRuleDocuments = getMigrationRuleDocuments(total, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.stats({ migrationId });
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'interrupted',
          id: migrationId,
          rules: {
            total,
            pending,
            processing,
            completed,
            failed,
          },
          last_execution: {
            is_aborted: false,
            started_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            ended_at: null,
            skip_prebuilt_rules_matching: false,
            connector_id: 'preconfigured-bedrock',
          },
        })
      );
    });

    it('should return stats for all existing migrations', async () => {
      const migrationId1 = uuidv4();
      const migrationId2 = uuidv4();

      const overrideCallback1 = statsOverrideCallbackFactory({
        migrationId: migrationId1,
        failed: 2,
        pending: 4,
        processing: 3,
        completed: 33,
        fullyTranslated: 10,
        partiallyTranslated: 10,
      });
      const migrationRuleDocuments1 = getMigrationRuleDocuments(42, overrideCallback1);
      const overrideCallback2 = statsOverrideCallbackFactory({
        migrationId: migrationId2,
        failed: 7,
        pending: 2,
        processing: 5,
        completed: 14,
        fullyTranslated: 3,
        partiallyTranslated: 5,
      });
      const migrationRuleDocuments2 = getMigrationRuleDocuments(28, overrideCallback2);
      await createMigrationRules(es, [...migrationRuleDocuments1, ...migrationRuleDocuments2]);

      const response = await migrationRulesRoutes.statsAll({});
      const expectedStats = expect.arrayContaining([
        expect.objectContaining({
          status: 'interrupted',
          id: migrationId1,
          rules: { total: 42, pending: 4, processing: 3, completed: 33, failed: 2 },
          last_execution: {
            is_aborted: false,
            started_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            ended_at: null,
            skip_prebuilt_rules_matching: false,
            connector_id: 'preconfigured-bedrock',
          },
        }),
        expect.objectContaining({
          status: 'interrupted',
          id: migrationId2,
          rules: { total: 28, pending: 2, processing: 5, completed: 14, failed: 7 },
          last_execution: {
            is_aborted: false,
            started_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            ended_at: null,
            skip_prebuilt_rules_matching: false,
            connector_id: 'preconfigured-bedrock',
          },
        }),
      ]);
      expect(response.body).toEqual(expectedStats);
    });

    it('should return translation stats for the specific migration', async () => {
      const migrationId = uuidv4();

      const failed = 3;
      const pending = 5;
      const processing = 7;
      const completed = 10;
      const total = failed + pending + processing + completed;
      const overrideCallback = statsOverrideCallbackFactory({
        migrationId,
        failed,
        pending,
        processing,
        completed, // 4 - full, 5 - partial, 1 - untranslated
        fullyTranslated: 4,
        partiallyTranslated: 5,
      });
      const migrationRuleDocuments = getMigrationRuleDocuments(total, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.translationStats({ migrationId });
      expect(response.body).toEqual(
        expect.objectContaining({
          id: migrationId,
          rules: {
            total,
            success: {
              total: completed,
              result: { full: 4, partial: 5, untranslatable: 1 },
              installable: 4,
              prebuilt: 0,
            },
            failed,
          },
        })
      );
    });

    describe('Error handling', () => {
      it('should return 404 if migration ID does not exist', async () => {
        const { body } = await migrationRulesRoutes.stats({
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
};
