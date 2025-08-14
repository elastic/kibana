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
  defaultElasticRule,
  deleteAllRuleMigrations,
  getMigrationRuleDocuments,
  ruleMigrationRouteHelpersFactory,
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

    it('should return empty stats when no migration exists', async () => {
      const response = await migrationRulesRoutes.integrationStats();
      expect(response.body).toEqual([]);
    });

    it('should return integrations stats', async () => {
      const documents = [
        {
          migrationId: uuidv4(),
          elastic_rule: {
            ...defaultElasticRule,
            integration_ids: ['integration3', 'integration2', 'integration1'],
          },
        },
        {
          migrationId: uuidv4(),
          elastic_rule: {
            ...defaultElasticRule,
            integration_ids: ['integration2', 'integration1'],
          },
        },
        {
          migrationId: uuidv4(),
          elastic_rule: { ...defaultElasticRule, integration_ids: ['integration1'] },
        },
      ];
      const migrationRuleDocuments = getMigrationRuleDocuments(
        documents.length,
        (index) => documents[index]
      );
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.integrationStats();
      expect(response.body).toEqual([
        { id: 'integration1', total_rules: 3 },
        { id: 'integration2', total_rules: 2 },
        { id: 'integration3', total_rules: 1 },
      ]);
    });

    it('should omit integration_ids with empty string', async () => {
      const documents = [
        {
          migrationId: uuidv4(),
          elastic_rule: {
            ...defaultElasticRule,
            integration_ids: ['integration1', ''],
          },
        },
        {
          migrationId: uuidv4(),
          elastic_rule: { ...defaultElasticRule, integration_ids: ['integration1', ''] },
        },
      ];
      const migrationRuleDocuments = getMigrationRuleDocuments(2, (index) => documents[index]);
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.integrationStats();
      expect(response.body).toEqual([{ id: 'integration1', total_rules: 2 }]);
    });
  });
};
