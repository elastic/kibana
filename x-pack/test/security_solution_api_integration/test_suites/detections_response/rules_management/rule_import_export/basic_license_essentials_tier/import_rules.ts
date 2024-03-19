/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getCustomQueryRuleParams, combineToNdJson, fetchRule } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
} from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless import_rules', () => {
    describe('importing rules with an index', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        const ndjson = combineToNdJson(getCustomQueryRuleParams());

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });

      it('should reject with an error if the file type is not that of a ndjson', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(''), 'rules.txt')
          .expect(400);

        expect(body).toEqual({
          status_code: 400,
          message: 'Invalid file extension .txt',
        });
      });

      it('should report that it imported a simple rule successfully', async () => {
        const ndjson = combineToNdJson(getCustomQueryRuleParams());

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
        });
      });

      it('should be able to read an imported rule back out correctly', async () => {
        const ruleToImport = getCustomQueryRuleParams({ rule_id: 'rule-to-import' });
        const ndjson = combineToNdJson(ruleToImport);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const importedRule = await fetchRule(supertest, { ruleId: 'rule-to-import' });

        expect(importedRule).toMatchObject(ruleToImport);
      });

      it('should fail validation when importing a rule with malformed "from" params on the rules', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            from: 'now-3755555555555555.67s',
            interval: '5m',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0].error.message).toBe('from: Failed to parse date-math expression');
      });

      it('should fail validation when importing two rules and one has a malformed "from" params', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'malformed-rule',
            from: 'now-3755555555555555.67s',
            interval: '5m',
          }),
          getCustomQueryRuleParams({
            rule_id: 'good-rule',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        // should result in one success and a failure message
        expect(body.success_count).toBe(1);
        expect(body.errors[0].error.message).toBe('from: Failed to parse date-math expression');
      });

      it('should be able to import two rules', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 2,
          rules_count: 2,
        });
      });

      // import is very slow in 7.10+ due to the alerts client find api
      // when importing 100 rules it takes about 30 seconds for this
      // test to complete so at 10 rules completing in about 10 seconds
      // I figured this is enough to make sure the import route is doing its job.
      it('should be able to import 10 rules', async () => {
        const ndjson = combineToNdJson(
          ...new Array(10).fill(0).map((_, i) =>
            getCustomQueryRuleParams({
              rule_id: `rule-${i}`,
            })
          )
        );
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 10,
          rules_count: 10,
        });
      });

      // uncomment the below test once we speed up the alerts client find api
      // in another PR.
      // it('should be able to import 10000 rules', async () => {
      //   const ruleIds = new Array(10000).fill(undefined).map((_, index) => `rule-${index}`);
      //   const { body } = await supertest
      //     .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
      //     .set('kbn-xsrf', 'true')
      //     .attach('file', getSimpleRuleAsNdjson(ruleIds, false), 'rules.ndjson')
      //     .expect(200);

      //   expect(body).to.eql({
      //     errors: [],
      //     success: true,
      //     success_count: 10000,
      //   });
      // });

      it('should NOT be able to import more than 10,000 rules', async () => {
        const ndjson = combineToNdJson(
          ...new Array(10001).fill(0).map((_, i) =>
            getCustomQueryRuleParams({
              rule_id: `rule-${i}`,
            })
          )
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(500);

        expect(body).toEqual({
          status_code: 500,
          message: "Can't import more than 10000 rules",
        });
      });

      it('should report a conflict if there is an attempt to import two rules with the same rule_id', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: 'More than one rule with rule-id: "rule-1" found',
                status_code: 400,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 1,
          rules_count: 2,
        });
      });

      it('should NOT report a conflict if there is an attempt to import two rules with the same rule_id and overwrite is set to true', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 2,
        });
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
        const ruleToImport = getCustomQueryRuleParams({
          rule_id: 'rule-1',
        });

        await createRule(supertest, log, ruleToImport);

        const ndjson = combineToNdJson(ruleToImport);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          rules_count: 1,
          success_count: 0,
        });
      });

      it('should NOT report a conflict if there is an attempt to import a rule with a rule_id that already exists and overwrite is set to true', async () => {
        const ruleToImport = getCustomQueryRuleParams({
          rule_id: 'rule-1',
        });

        await createRule(supertest, log, ruleToImport);

        const ndjson = combineToNdJson(ruleToImport);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
        });
      });

      it('should overwrite an existing rule if overwrite is set to true', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-to-overwrite',
          })
        );

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-to-overwrite',
            name: 'some other name',
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const importedRule = await fetchRule(supertest, { ruleId: 'rule-to-overwrite' });

        expect(importedRule).toMatchObject({
          name: 'some other name',
        });
      });

      it('should bump a revision when overwriting a rule', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-to-overwrite',
          })
        );

        const ruleBeforeOverwriting = await fetchRule(supertest, { ruleId: 'rule-to-overwrite' });

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-to-overwrite',
            name: 'some other name',
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const ruleAfterOverwriting = await fetchRule(supertest, { ruleId: 'rule-to-overwrite' });

        expect(ruleBeforeOverwriting).toMatchObject({
          revision: 0,
        });
        expect(ruleAfterOverwriting).toMatchObject({
          revision: 1,
        });
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'existing-rule',
          })
        );

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'existing-rule',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule-2',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: 'rule_id: "existing-rule" already exists',
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

      it('should report a mix of conflicts and a mix of successes', async () => {
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

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-2',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule',
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: 'rule_id: "existing-rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'existing-rule-1',
            },
            {
              error: {
                message: 'rule_id: "existing-rule-2" already exists',
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

      it('should be able to correctly read back a mixed import of different rules even if some cause conflicts', async () => {
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

        const ndjson = combineToNdJson(existingRule1, existingRule2, ruleToImportSuccessfully);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const rule1 = await fetchRule(supertest, { ruleId: 'existing-rule-1' });
        const rule2 = await fetchRule(supertest, { ruleId: 'existing-rule-2' });
        const rule3 = await fetchRule(supertest, { ruleId: 'non-existing-rule' });

        expect(rule1).toMatchObject(existingRule1);
        expect(rule2).toMatchObject(existingRule2);
        expect(rule3).toMatchObject(ruleToImportSuccessfully);
      });
    });
  });
};
