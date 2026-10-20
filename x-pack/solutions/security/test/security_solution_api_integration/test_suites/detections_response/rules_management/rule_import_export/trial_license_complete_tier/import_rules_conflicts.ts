/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { fetchRule, getCustomQueryRuleParams, importRules } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const RULE_TO_IMPORT_RULE_ID = 'imported-rule';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules conflicts', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('reports a conflict if there is an attempt to import two rules with the same rule_id', async () => {
      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          name: 'First in file',
        }),
        getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          name: 'Last in file',
        }),
      ];

      const importResponse = await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        errors: [
          {
            error: {
              message: `More than one rule with rule-id: "${RULE_TO_IMPORT_RULE_ID}" found`,
              status_code: 400,
            },
            rule_id: RULE_TO_IMPORT_RULE_ID,
          },
        ],
        success: false,
        success_count: 1,
        rules_count: 2,
      });

      // In-file duplicate still creates exactly one rule; last entry wins.
      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 10,
            filter: `alert.attributes.params.ruleId: "${RULE_TO_IMPORT_RULE_ID}"`,
          },
        })
        .expect(200);

      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Last in file');
    });

    it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
      const existingRule = getCustomQueryRuleParams({
        rule_id: RULE_TO_IMPORT_RULE_ID,
        name: 'Already exists',
      });

      await createRule(supertest, log, existingRule);

      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          name: 'Should not overwrite',
        }),
      ];

      const importResponse = await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        errors: [
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: RULE_TO_IMPORT_RULE_ID,
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 1,
      });

      const persisted = await fetchRule(supertest, { ruleId: RULE_TO_IMPORT_RULE_ID });
      expect(persisted).toMatchObject(existingRule);
    });

    it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
      const existingRule = getCustomQueryRuleParams({
        rule_id: 'existing-rule',
        name: 'Existing conflict',
      });
      const createdOne = getCustomQueryRuleParams({
        rule_id: 'non-existing-rule-1',
        name: 'Created one',
      });
      const createdTwo = getCustomQueryRuleParams({
        rule_id: 'non-existing-rule-2',
        name: 'Created two',
      });

      await createRule(supertest, log, existingRule);

      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
          name: 'Should not overwrite',
        }),
        createdOne,
        createdTwo,
      ];

      const importResponse = await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        errors: [
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: 'existing-rule',
          },
        ],
        success: false,
        success_count: 2,
        rules_count: 3,
      });

      expect(await fetchRule(supertest, { ruleId: 'existing-rule' })).toMatchObject(existingRule);
      expect(await fetchRule(supertest, { ruleId: 'non-existing-rule-1' })).toMatchObject(
        createdOne
      );
      expect(await fetchRule(supertest, { ruleId: 'non-existing-rule-2' })).toMatchObject(
        createdTwo
      );
    });

    it('reports a mix of conflicts and a mix of successes', async () => {
      const existingRule1 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-1',
        name: 'Existing one',
      });
      const existingRule2 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-2',
        name: 'Existing two',
      });
      const created = getCustomQueryRuleParams({
        rule_id: 'non-existing-rule',
        name: 'Created by import',
      });

      await createRule(supertest, log, existingRule1);
      await createRule(supertest, log, existingRule2);

      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-1',
          name: 'Should not overwrite one',
        }),
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-2',
          name: 'Should not overwrite two',
        }),
        created,
      ];

      const importResponse = await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        errors: [
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: 'existing-rule-1',
          },
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: 'existing-rule-2',
          },
        ],
        success: false,
        success_count: 1,
        rules_count: 3,
      });

      expect(await fetchRule(supertest, { ruleId: 'existing-rule-1' })).toMatchObject(
        existingRule1
      );
      expect(await fetchRule(supertest, { ruleId: 'existing-rule-2' })).toMatchObject(
        existingRule2
      );
      expect(await fetchRule(supertest, { ruleId: 'non-existing-rule' })).toMatchObject(created);
    });

    it('reads back a mixed import of different rules even if some cause conflicts', async () => {
      const existingRule1 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-1',
        name: 'Existing one',
        enabled: false,
      });
      const existingRule2 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-2',
        name: 'Existing two',
        enabled: false,
      });
      const ruleToImportSuccessfully = getCustomQueryRuleParams({
        rule_id: 'non-existing-rule',
        name: 'Created by import',
        enabled: false,
      });

      await createRule(supertest, log, existingRule1);
      await createRule(supertest, log, existingRule2);

      const IMPORT_PAYLOAD = [existingRule1, existingRule2, ruleToImportSuccessfully];

      const importResponse = await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      // Assert errors and persisted state together so a rewrite cannot swallow
      // per-item conflicts while still creating the successful rule.
      expect(importResponse).toMatchObject({
        success: false,
        success_count: 1,
        rules_count: 3,
        errors: [
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: 'existing-rule-1',
          },
          {
            error: {
              message: 'Rule with this rule_id already exists',
              status_code: 409,
            },
            rule_id: 'existing-rule-2',
          },
        ],
      });

      const rule1 = await fetchRule(supertest, { ruleId: 'existing-rule-1' });
      const rule2 = await fetchRule(supertest, { ruleId: 'existing-rule-2' });
      const rule3 = await fetchRule(supertest, { ruleId: 'non-existing-rule' });

      expect(rule1).toMatchObject(existingRule1);
      expect(rule2).toMatchObject(existingRule2);
      expect(rule3).toMatchObject(ruleToImportSuccessfully);
    });
  });
};
