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
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules conflicts', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('reports a conflict if there is an attempt to import two rules with the same rule_id', async () => {
      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
        getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
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
    });

    it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
      const existingRule = getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID });

      await createRule(supertest, log, existingRule);

      const IMPORT_PAYLOAD = [existingRule];

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
    });

    it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
        })
      );

      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
        }),
        getCustomQueryRuleParams({
          rule_id: 'non-existing-rule-1',
        }),
        getCustomQueryRuleParams({
          rule_id: 'non-existing-rule-2',
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
            rule_id: 'existing-rule',
          },
        ],
        success: false,
        success_count: 2,
        rules_count: 3,
      });
    });

    it('reports a mix of conflicts and a mix of successes', async () => {
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-1',
        })
      );
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-2',
        })
      );

      const IMPORT_PAYLOAD = [
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-1',
        }),
        getCustomQueryRuleParams({
          rule_id: 'existing-rule-2',
        }),
        getCustomQueryRuleParams({
          rule_id: 'non-existing-rule',
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
    });

    it('reads back a mixed import of different rules even if some cause conflicts', async () => {
      const existingRule1 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-1',
      });
      const existingRule2 = getCustomQueryRuleParams({
        rule_id: 'existing-rule-2',
      });
      const ruleToImportSuccessfully = getCustomQueryRuleParams({
        rule_id: 'non-existing-rule',
      });

      await createRule(supertest, log, existingRule1);
      await createRule(supertest, log, existingRule2);

      const IMPORT_PAYLOAD = [existingRule1, existingRule2, ruleToImportSuccessfully];

      await importRules({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
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
