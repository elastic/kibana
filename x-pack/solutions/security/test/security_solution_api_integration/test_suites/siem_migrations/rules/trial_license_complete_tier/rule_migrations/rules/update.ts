/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { MigrationTranslationResult } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import { defaultRiskScoreBySeverity } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import {
  createMigrationRules,
  defaultOriginalRule,
  deleteAllRuleMigrations,
  getMigrationRuleDocument,
  ruleMigrationRouteHelpersFactory,
} from '../../../../utils';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../../detections_response/utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Update Rules API', () => {
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
    });

    describe('Happy path', () => {
      it('should update migration rules', async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        const [createdDocumentId] = await createMigrationRules(es, [migrationRuleDocument]);

        const now = new Date().toISOString();

        const {
          body: { updated },
        } = await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [
            {
              id: createdDocumentId,
              elastic_rule: { title: 'Updated title' },
              comments: [{ message: 'Update comment', created_by: 'ftr test', created_at: now }],
            },
          ],
        });

        expect(updated).toBe(true);

        // fetch migration rule
        const response = await ruleMigrationRoutes.getRules({ migrationId });
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
        await ruleMigrationRoutes.updateRules({
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
        const response = await ruleMigrationRoutes.getRules({ migrationId });
        expect(response.body.total).toEqual(1);

        const migrationRule = response.body.data[0];
        expect(migrationRule).toEqual(expectedMigrationRule);
      });
    });

    it('should take title and description from the original rule when a query is set on an untranslated rule', async () => {
      const migrationId = uuidv4();
      const [id] = await createMigrationRules(es, [
        getMigrationRuleDocument({
          migration_id: migrationId,
          translation_result: 'untranslatable',
          elastic_rule: undefined,
        }),
      ]);

      await ruleMigrationRoutes.updateRules({
        migrationId,
        payload: [{ id, elastic_rule: { query: 'FROM logs-* | LIMIT 1', query_language: 'esql' } }],
      });

      const { body } = await ruleMigrationRoutes.getRules({ migrationId });
      const { title, description } = body.data[0].elastic_rule ?? {};
      expect({ title, description }).toEqual({
        title: defaultOriginalRule.title,
        description: defaultOriginalRule.description,
      });
    });

    describe('Error handling', () => {
      it('should return empty content response when no rules passed', async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);
        await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [],
          expectStatusCode: 204,
        });
      });

      it(`should return an error when rule's id is not specified`, async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);
        const response = await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [{ elastic_rule: { title: 'Updated title' } }],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          error: 'Bad Request',
          message: '[request body]: 0.id: Invalid input: expected string, received undefined',
          statusCode: 400,
        });
      });

      it('should return 400 naming the ids when rule migration items are not found', async () => {
        const migrationId = uuidv4();
        const [id] = await createMigrationRules(es, [
          getMigrationRuleDocument({ migration_id: migrationId }),
        ]);
        const response = await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [
            { id, elastic_rule: { title: 'Updated title' } },
            { id: 'unknown-item-id', elastic_rule: { title: 'Updated title' } },
          ],
          expectStatusCode: 400,
        });
        expect(response.body).toEqual(
          expect.objectContaining({
            message: 'Rule Migration item(s) not found: unknown-item-id',
          })
        );
      });

      it(`should return an error when undefined payload has been passed`, async () => {
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);
        const response = await ruleMigrationRoutes.updateRules({
          migrationId,
          expectStatusCode: 400,
        });
        expect(response.body).toEqual({
          error: 'Bad Request',
          message: '[request body]: Invalid input: expected array, received null',
          statusCode: 400,
        });
      });
    });

    describe('@skipInServerlessMKI Prebuilt rule match', () => {
      const prebuiltRuleAsset = createRuleAssetSavedObject({
        rule_id: 'prebuilt-1',
        version: 1,
        name: 'Asset Name',
        description: 'Asset description',
        severity: 'critical',
        risk_score: 99,
        related_integrations: [{ package: 'windows', version: '^1.0.0' }],
      });

      // Every elastic_rule field is derived from the asset; the previous ES|QL query is cleared.
      const expectedElasticRule = {
        prebuilt_rule_id: 'prebuilt-1',
        title: 'Asset Name',
        description: 'Asset description',
        severity: 'critical',
        risk_score: 99,
        integration_ids: ['windows'],
        query: null,
        query_language: null,
      };

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllRuleMigrations(es);
        await deleteAllPrebuiltRuleAssets(es, log);
        await createPrebuiltRuleAssetSavedObjects(es, [prebuiltRuleAsset]);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      // Default migration doc carries an ES|QL query (defaultElasticRule) and translation_result
      // 'partial', so both the query clearing and the switch to 'full' are observable.
      const patchWithPrebuiltRuleId = async (prebuiltRuleId: string, expectStatusCode = 200) => {
        const migrationId = uuidv4();
        const [id] = await createMigrationRules(es, [
          getMigrationRuleDocument({ migration_id: migrationId }),
        ]);
        const response = await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [{ id, elastic_rule: { prebuilt_rule_id: prebuiltRuleId, title: 'LLM title' } }],
          expectStatusCode,
        });
        return { migrationId, response };
      };

      const getStoredRule = async (migrationId: string) => {
        const { body } = await ruleMigrationRoutes.getRules({ migrationId });
        return body.data[0];
      };

      it('should replace elastic_rule with the fields derived from the prebuilt rule asset', async () => {
        const { migrationId } = await patchWithPrebuiltRuleId('prebuilt-1');
        expect((await getStoredRule(migrationId)).elastic_rule).toEqual(expectedElasticRule);
      });

      it('should set translation_result to full', async () => {
        const { migrationId } = await patchWithPrebuiltRuleId('prebuilt-1');
        expect((await getStoredRule(migrationId)).translation_result).toBe(
          MigrationTranslationResult.FULL
        );
      });

      it('should set elastic_rule.id to the installed rule when the prebuilt rule is installed', async () => {
        const {
          results: { created },
        } = await installPrebuiltRules(es, supertest, [{ rule_id: 'prebuilt-1', version: 1 }]);
        const { migrationId } = await patchWithPrebuiltRuleId('prebuilt-1');
        expect((await getStoredRule(migrationId)).elastic_rule?.id).toBe(created[0].id);
      });

      it('should reset severity and risk_score from the original rule when unmatched', async () => {
        const migrationId = uuidv4();
        const [id] = await createMigrationRules(es, [
          getMigrationRuleDocument({
            migration_id: migrationId,
            // Splunk scale → Elastic 'high'
            original_rule: { ...defaultOriginalRule, severity: '4' },
          }),
        ]);
        await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [{ id, elastic_rule: { prebuilt_rule_id: 'prebuilt-1' } }],
        });
        await ruleMigrationRoutes.updateRules({
          migrationId,
          payload: [
            {
              id,
              elastic_rule: {
                prebuilt_rule_id: null,
                query: 'FROM logs-* | LIMIT 1',
                query_language: 'esql',
              },
            },
          ],
        });

        const { elastic_rule: elasticRule } = await getStoredRule(migrationId);
        expect({ severity: elasticRule?.severity, risk_score: elasticRule?.risk_score }).toEqual({
          severity: 'high',
          risk_score: defaultRiskScoreBySeverity.high,
        });
      });

      it('should return 400 naming the id when the prebuilt rule is unknown', async () => {
        const { response } = await patchWithPrebuiltRuleId('unknown-id', 400);
        expect(response.body).toEqual(
          expect.objectContaining({ message: 'Prebuilt rule "unknown-id" not found' })
        );
      });
    });
  });
};
