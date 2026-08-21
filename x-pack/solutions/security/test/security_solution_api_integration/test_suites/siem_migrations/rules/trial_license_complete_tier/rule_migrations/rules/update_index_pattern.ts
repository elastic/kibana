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
  getMigrationRuleDocument,
  ruleMigrationRouteHelpersFactory,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Update Index Pattern API', () => {
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
    });

    describe('Happy path', () => {
      it('should update index pattern and change translation_result from partial to full', async () => {
        const migrationId = uuidv4();
        const ruleDoc = getMigrationRuleDocument({
          migration_id: migrationId,
          translation_result: 'partial',
          elastic_rule: {
            title: 'Test Rule',
            severity: 'low',
            risk_score: 21,
            query: 'FROM [indexPattern]\n| STATS count BY dest',
            query_language: 'esql',
            description: 'Test rule with missing index pattern',
          },
        });

        const ruleIds = await createMigrationRules(es, [ruleDoc]);

        // Verify initial state is partial
        const { body: rulesBeforeUpdate } = await ruleMigrationRoutes.getRules({
          migrationId,
        });
        const ruleBefore = rulesBeforeUpdate.data.find((r) => r.id === ruleIds[0]);
        expect(ruleBefore?.translation_result).toBe('partial');
        expect(ruleBefore?.elastic_rule?.query).toContain('[indexPattern]');

        // Update index pattern
        const { body: updateResponse } = await ruleMigrationRoutes.updateIndexPattern({
          migrationId,
          payload: { index_pattern: 'logs-*', ids: ruleIds },
        });
        expect(updateResponse.updated).toBe(1);

        // Verify translation_result changed to full
        const { body: rulesAfterUpdate } = await ruleMigrationRoutes.getRules({
          migrationId,
        });
        const ruleAfter = rulesAfterUpdate.data.find((r) => r.id === ruleIds[0]);
        expect(ruleAfter?.translation_result).toBe('full');
        expect(ruleAfter?.elastic_rule?.query).toBe('FROM logs-*\n| STATS count BY dest');
      });

      it('should update index pattern for all rules in migration without specifying ids', async () => {
        const migrationId = uuidv4();
        const rules = [
          getMigrationRuleDocument({
            migration_id: migrationId,
            translation_result: 'partial',
            elastic_rule: {
              title: 'Rule 1',
              severity: 'low',
              risk_score: 21,
              query: 'FROM [indexPattern]\n| LIMIT 10',
              query_language: 'esql',
              description: 'Rule 1',
            },
          }),
          getMigrationRuleDocument({
            migration_id: migrationId,
            translation_result: 'partial',
            elastic_rule: {
              title: 'Rule 2',
              severity: 'low',
              risk_score: 21,
              query: 'FROM [indexPattern]\n| LIMIT 5',
              query_language: 'esql',
              description: 'Rule 2',
            },
          }),
        ];

        await createMigrationRules(es, rules);

        const { body: updateResponse } = await ruleMigrationRoutes.updateIndexPattern({
          migrationId,
          payload: { index_pattern: 'filebeat-*' },
        });
        expect(updateResponse.updated).toBe(2);

        const { body: rulesAfterUpdate } = await ruleMigrationRoutes.getRules({
          migrationId,
        });
        for (const rule of rulesAfterUpdate.data) {
          expect(rule.translation_result).toBe('full');
          expect(rule.elastic_rule?.query).not.toContain('[indexPattern]');
        }
      });
      it('should not promote to full if query still contains macro/lookup tokens', async () => {
        const migrationId = uuidv4();
        const ruleDoc = getMigrationRuleDocument({
          migration_id: migrationId,
          translation_result: 'partial',
          elastic_rule: {
            title: 'Rule with macro',
            severity: 'low',
            risk_score: 21,
            query: 'FROM [indexPattern]\n| WHERE [macro:my_filter]',
            query_language: 'esql',
            description: 'Rule with unresolved macro',
          },
        });

        const ruleIds = await createMigrationRules(es, [ruleDoc]);

        const { body: updateResponse } = await ruleMigrationRoutes.updateIndexPattern({
          migrationId,
          payload: { index_pattern: 'logs-*', ids: ruleIds },
        });
        expect(updateResponse.updated).toBe(1);

        const { body: rulesAfterUpdate } = await ruleMigrationRoutes.getRules({
          migrationId,
        });
        const ruleAfter = rulesAfterUpdate.data.find((r) => r.id === ruleIds[0]);
        // Query updated but status stays partial due to unresolved macro
        expect(ruleAfter?.elastic_rule?.query).toBe('FROM logs-*\n| WHERE [macro:my_filter]');
        expect(ruleAfter?.translation_result).toBe('partial');
      });
    });

    describe('Error handling', () => {
      it('should return 404 if migration ID does not exist', async () => {
        await ruleMigrationRoutes.updateIndexPattern({
          migrationId: 'non-existing-migration-id',
          payload: { index_pattern: 'logs-*' },
          expectStatusCode: 404,
        });
      });
    });
  });
};
