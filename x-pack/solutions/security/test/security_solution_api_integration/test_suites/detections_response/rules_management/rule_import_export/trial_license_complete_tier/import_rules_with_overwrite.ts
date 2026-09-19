/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import {
  getImportExceptionsListItemNewerVersionSchemaMock,
  getImportExceptionsListSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import {
  clearChangeHistory,
  combineToNdJson,
  getCustomQueryRuleParams,
  fetchRule,
  importRules,
  importRulesWithSuccess,
  refreshChangeHistory,
} from '../../../utils';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import_rules with rule overwrite set to "true"', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
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
      const existing = await createRule(
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

      expect(importedRule.id).toBe(existing.id);
      expect(importedRule.name).toBe('Imported rule');
      expect(importedRule.revision).toBe(existing.revision + 1);
      expect(importedRule.created_at).toBe(existing.created_at);
      expect(importedRule.created_by).toBe(existing.created_by);
      expect(importedRule.updated_at).not.toBe(existing.updated_at);
      expect(typeof importedRule.updated_by).toBe('string');
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

    it('enables a disabled rule when overwriting with enabled true', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-enable-rule',
          name: 'Disabled before overwrite',
          enabled: false,
        })
      );

      await importRulesWithSuccess({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-enable-rule',
            name: 'Enabled after overwrite',
            enabled: true,
          }),
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-enable-rule' } })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.enabled).toBe(true);
      expect(body.name).toBe('Enabled after overwrite');
      expect(body.revision).toBe(existing.revision + 1);
    });

    it('disables an enabled rule when overwriting with enabled false', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-disable-rule',
          name: 'Enabled before overwrite',
          enabled: true,
        })
      );

      await importRulesWithSuccess({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-disable-rule',
            name: 'Disabled after overwrite',
            enabled: false,
          }),
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-disable-rule' } })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.enabled).toBe(false);
      expect(body.name).toBe('Disabled after overwrite');
      expect(body.revision).toBe(existing.revision + 1);
    });

    it('updates interval when overwriting an existing rule', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-interval-rule',
          name: 'Before interval overwrite',
          interval: '100m',
          enabled: false,
        })
      );

      await importRulesWithSuccess({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-interval-rule',
            name: 'After interval overwrite',
            interval: '1h',
            enabled: false,
          }),
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-interval-rule' } })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.interval).toBe('1h');
      expect(body.name).toBe('After interval overwrite');
      expect(body.revision).toBe(existing.revision + 1);
    });

    it('updates interval when overwriting an enabled rule', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-enabled-interval-rule',
          name: 'Before enabled interval overwrite',
          interval: '100m',
          enabled: true,
        })
      );

      await importRulesWithSuccess({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-enabled-interval-rule',
            name: 'After enabled interval overwrite',
            interval: '1h',
            enabled: true,
          }),
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-enabled-interval-rule' } })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.interval).toBe('1h');
      expect(body.enabled).toBe(true);
      expect(body.name).toBe('After enabled interval overwrite');
      expect(body.revision).toBe(existing.revision + 1);
    });

    it('attaches an exceptions list when overwriting an existing rule', async () => {
      const existing = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: 'overwrite-exceptions-rule',
          name: 'Before exceptions overwrite',
          enabled: false,
        })
      );

      const exceptionsList = [
        {
          id: 'overwrite-exceptions-list',
          list_id: 'overwrite_exceptions_list',
          type: 'detection' as const,
          namespace_type: 'single' as const,
        },
      ];

      const importResponse = await importRules({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: 'overwrite-exceptions-rule',
            name: 'After exceptions overwrite',
            enabled: false,
            exceptions_list: exceptionsList,
          }),
          {
            ...getImportExceptionsListSchemaMock('overwrite_exceptions_list'),
            type: 'detection',
          },
          getImportExceptionsListItemNewerVersionSchemaMock(
            'overwrite_exceptions_item',
            'overwrite_exceptions_list'
          ),
        ],
        overwrite: true,
      });

      expect(importResponse).toMatchObject({
        success: true,
        success_count: 1,
        rules_count: 1,
        errors: [],
        exceptions_success: true,
        exceptions_success_count: 1,
        exceptions_errors: [],
      });

      const { body } = await detectionsApi
        .readRule({ query: { rule_id: 'overwrite-exceptions-rule' } })
        .expect(200);

      expect(body.id).toBe(existing.id);
      expect(body.name).toBe('After exceptions overwrite');
      expect(body.revision).toBe(existing.revision + 1);
      expect(body.exceptions_list).toEqual([
        {
          ...exceptionsList[0],
          id: expect.any(String),
        },
      ]);
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
      expect(updatedFirst.revision).toBe(first.revision + 1);
      expect(updatedSecond.id).toBe(second.id);
      expect(updatedSecond.name).toBe('Updated two');
      expect(updatedSecond.revision).toBe(second.revision + 1);
      expect(unchanged.id).toBe(failed.id);
      expect(unchanged.name).toBe('Existing bad');
      expect(unchanged.revision).toBe(failed.revision);
    });

    it('reports partial success when one overwrite target references a missing connector', async () => {
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
          getCustomQueryRuleParams({
            rule_id: 'overwrite-partial-bad',
            name: 'Should not update',
            enabled: false,
            actions: [
              {
                group: 'default',
                id: 'missing-overwrite-connector',
                action_type_id: '.webhook',
                params: {},
              },
            ],
          }),
        ],
        overwrite: true,
      });

      expect(importResponse).toMatchObject({
        success: false,
        success_count: 2,
        rules_count: 3,
        errors: [
          {
            rule_id: 'overwrite-partial-bad',
            error: {
              status_code: 404,
              message:
                'Rule actions reference the following missing action IDs: missing-overwrite-connector',
            },
          },
        ],
      });

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
      expect(updatedFirst.revision).toBe(first.revision + 1);
      expect(updatedSecond.id).toBe(second.id);
      expect(updatedSecond.name).toBe('Updated two');
      expect(updatedSecond.revision).toBe(second.revision + 1);
      expect(unchanged.id).toBe(failed.id);
      expect(unchanged.name).toBe('Existing bad');
      expect(unchanged.revision).toBe(failed.revision);
    });

    // History API is ESS-only until ruleChangesHistoryEnabled is on in serverless.
    describe('@ess @skipInServerless overwrite change history', () => {
      beforeEach(async () => {
        await clearChangeHistory(es);
      });

      it('records rule_import when overwriting an existing rule', async () => {
        const { body: rule } = await detectionsApi
          .createRule({
            body: getCustomQueryRuleParams({
              rule_id: 'overwrite-history-rule',
              name: 'Before import overwrite',
              enabled: false,
            }),
          })
          .expect(200);

        await importRulesWithSuccess({
          getService,
          rules: [
            getCustomQueryRuleParams({
              rule_id: 'overwrite-history-rule',
              name: 'After import overwrite',
              enabled: false,
            }),
          ],
          overwrite: true,
        });

        await refreshChangeHistory(es);

        const { body } = await detectionsApi
          .ruleChangesHistory({ params: { ruleId: rule.id }, query: {} })
          .expect(200);

        expect(body.items).toHaveLength(2);

        const [imported, created] = body.items;
        expect(imported.action).toBe('rule_import');
        expect(imported.metadata?.bulk_count).toBe(1);
        expect(imported.rule.revision).toBe(1);
        expect(imported.rule.name).toBe('After import overwrite');
        expect(imported.old_values).toMatchObject({
          name: 'Before import overwrite',
          revision: 0,
        });
        expect(imported.rule.created_at).not.toBe(imported.rule.updated_at);

        expect(created.action).toBe('rule_create');
        expect(created.metadata?.bulk_count).toBeUndefined();
        expect(created.rule.revision).toBe(0);
        expect(created.rule.name).toBe('Before import overwrite');
        expect(created.old_values).toBeNull();
      });
    });
  });
};
