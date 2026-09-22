/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { combineToNdJson, getCustomQueryRuleParams, fetchRule, importRules } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import_rules with rule overwrite set to "true"', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('DOES NOT report a conflict if there is an attempt to import two rules with the same rule_id', async () => {
      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({ rule_id: 'rule-1', name: 'Rule 1' }),
        getCustomQueryRuleParams({ rule_id: 'rule-1', name: 'Rule 2' })
      );

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_IMPORT_URL}?overwrite=true`)
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

      const importedRule = await fetchRule(supertest, { ruleId: 'rule-1' });

      expect(importedRule.name).toBe('Rule 2');
    });

    it('DOES NOT report a conflict if there is an attempt to import a rule twice', async () => {
      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({
          rule_id: 'imported-rule',
          name: 'Imported rule',
        })
      );

      await supertest
        .post(`${DETECTION_ENGINE_RULES_IMPORT_URL}?overwrite=true`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .attach('file', Buffer.from(ndjson), 'rules.ndjson')
        .expect(200);

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_IMPORT_URL}?overwrite=true`)
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

    it('overwrites an existing rule', async () => {
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
          name: 'Existing rule',
        })
      );

      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
          name: 'Imported rule',
        })
      );

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_IMPORT_URL}?overwrite=true`)
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

      const importedRule = await fetchRule(supertest, { ruleId: 'existing-rule' });

      expect(importedRule.name).toBe('Imported rule');
    });

    /**
     * Existing rule may have nullable fields set to a value (e.g. `timestamp_override` is set to `some.value`) but
     * a rule to import doesn't have these fields set (e.g. `timestamp_override` is NOT present at all in the ndjson file).
     * We expect the updated rule won't have such fields preserved (e.g. `timestamp_override` will be removed).
     */
    it('ensures overwritten rule DOES NOT preserve fields missed in the imported rule', async () => {
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
          rule_name_override: 'some name',
          timestamp_override: 'some.value',
          timeline_id: 'some id',
          timeline_title: 'some title',
          outcome: 'exactMatch',
          alias_target_id: 'some id',
          license: 'some license',
          note: 'some notes',
          building_block_type: 'some type',
          output_index: 'some-index',
          namespace: 'some-namespace',
          meta: {
            some: 'field',
          },
          investigation_fields: { field_names: ['a', 'b', 'c'] },
          throttle: 'no_actions',
        })
      );

      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({
          rule_id: 'existing-rule',
          namespace: 'abc',
        })
      );

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_IMPORT_URL}?overwrite=true`)
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

      const importedRule = await fetchRule(supertest, { ruleId: 'existing-rule' });

      expect(importedRule).toMatchObject({
        rule_id: 'existing-rule',
        output_index: '',
      });
      expect(importedRule).toEqual(
        expect.not.objectContaining({
          rule_name_override: expect.anything(),
          timestamp_override: expect.anything(),
          timeline_id: expect.anything(),
          timeline_title: expect.anything(),
          outcome: expect.anything(),
          alias_target_id: expect.anything(),
          license: expect.anything(),
          note: expect.anything(),
          building_block_type: expect.anything(),
          namespace: expect.anything(),
          meta: expect.anything(),
          investigation_fields: expect.anything(),
          throttle: expect.anything(),
        })
      );
    });

    it('reports partial success when overwriting a batch with one schema-invalid rule', async () => {
      const first = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-partial-ok-1',
          name: 'Existing one',
          enabled: false,
        })
      );
      const second = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-partial-ok-2',
          name: 'Existing two',
          enabled: false,
        })
      );
      const failed = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-partial-bad',
          name: 'Existing bad',
          enabled: false,
        })
      );

      const importResponse = await importRules({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-partial-ok-1',
            name: 'Updated one',
            enabled: false,
          }),
          getCustomQueryRuleParams({
            rule_id: 'overwrite-partial-ok-2',
            name: 'Updated two',
            enabled: false,
          }),
          {
            ...getCustomQueryRuleParams({
              rule_id: 'overwrite-partial-bad',
              name: 'Should not update',
              enabled: false,
            }),
            risk_score: 101,
          },
        ],
        overwrite: true,
      });

      expect(importResponse).toMatchObject({
        success: false,
        success_count: 2,
        rules_count: 3,
        errors: [
          {
            error: {
              message: 'risk_score: Too big: expected number to be <=100',
              status_code: 400,
            },
          },
        ],
      });
      // Schema validation failures currently omit rule_id on the error object.
      expect(importResponse.errors[0].rule_id).toBeUndefined();

      const { body: updatedFirst } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-partial-ok-1' } })
        .expect(200);
      const { body: updatedSecond } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-partial-ok-2' } })
        .expect(200);
      const { body: unchanged } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-partial-bad' } })
        .expect(200);

      expect(updatedFirst.id).toBe(first.id);
      expect(updatedFirst.name).toBe('Updated one');
      expect(updatedSecond.id).toBe(second.id);
      expect(updatedSecond.name).toBe('Updated two');
      expect(unchanged.id).toBe(failed.id);
      expect(unchanged.name).toBe('Existing bad');
    });
  });
};
