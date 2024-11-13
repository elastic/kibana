/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
  getImportExceptionsListItemNewerVersionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import {
  combineToNdJson,
  fetchRule,
  getCustomQueryRuleParams,
  getThresholdRuleForAlertTesting,
} from '../../../utils';
import { createRule } from '../../../../../../common/utils/security_solution';
import { deleteAllRules } from '../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';
import { createConnector } from '../../../utils/connectors';

const getImportRuleBuffer = (connectorId: string) => {
  const rule1 = {
    id: '53aad690-544e-11ec-a349-11361cc441c4',
    updated_at: '2021-12-03T15:33:13.271Z',
    updated_by: 'elastic',
    created_at: '2021-12-03T15:33:13.271Z',
    created_by: 'elastic',
    name: '7.16 test with action',
    tags: [],
    interval: '5m',
    enabled: true,
    description: 'test',
    risk_score: 21,
    severity: 'low',
    license: '',
    output_index: '',
    meta: { from: '1m', kibana_siem_app_url: 'http://0.0.0.0:5601/s/7/app/security' },
    author: [],
    false_positives: [],
    from: 'now-360s',
    rule_id: 'aa525d7c-8948-439f-b32d-27e00c750246',
    max_signals: 100,
    risk_score_mapping: [],
    severity_mapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptions_list: [],
    immutable: false,
    type: 'query',
    language: 'kuery',
    index: [
      'apm-*-transaction*',
      'traces-apm*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'winlogbeat-*',
    ],
    query: '*:*',
    filters: [],
    throttle: '1h',
    actions: [
      {
        group: 'default',
        id: connectorId,
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        },
        action_type_id: '.slack',
      },
    ],
  };
  const ndjson = combineToNdJson(rule1);

  return Buffer.from(ndjson);
};
const getImportRuleWithConnectorsBuffer = (connectorId: string) => {
  const rule1 = {
    id: '53aad690-544e-11ec-a349-11361cc441c4',
    updated_at: '2021-12-03T15:33:13.271Z',
    updated_by: 'elastic',
    created_at: '2021-12-03T15:33:13.271Z',
    created_by: 'elastic',
    name: '7.16 test with action',
    tags: [],
    interval: '5m',
    enabled: true,
    description: 'test',
    risk_score: 21,
    severity: 'low',
    license: '',
    output_index: '',
    meta: { from: '1m', kibana_siem_app_url: 'http://0.0.0.0:5601/s/7/app/security' },
    author: [],
    false_positives: [],
    from: 'now-360s',
    rule_id: 'aa525d7c-8948-439f-b32d-27e00c750246',
    max_signals: 100,
    risk_score_mapping: [],
    severity_mapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptions_list: [],
    immutable: false,
    type: 'query',
    language: 'kuery',
    index: [
      'apm-*-transaction*',
      'traces-apm*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'winlogbeat-*',
    ],
    query: '*:*',
    filters: [],
    throttle: '1h',
    actions: [
      {
        group: 'default',
        id: connectorId,
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        },
        action_type_id: '.slack',
      },
    ],
  };
  const connector = {
    id: connectorId,
    type: 'action',
    updated_at: '2023-01-25T14:35:52.852Z',
    created_at: '2023-01-25T14:35:52.852Z',
    version: 'WzUxNTksMV0=',
    attributes: {
      actionTypeId: '.slack',
      name: 'slack',
      isMissingSecrets: false,
      config: {},
      secrets: {},
    },
    references: [],
    migrationVersion: { action: '8.3.0' },
    coreMigrationVersion: '8.7.0',
  };
  const ndjson = combineToNdJson(rule1, connector);

  return Buffer.from(ndjson);
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('@ess @serverless @skipInServerlessMKI import_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('threshold validation', () => {
      it('should result in partial success if no threshold-specific fields are provided', async () => {
        const { threshold, ...rule } = getThresholdRuleForAlertTesting(['*']);
        const ndjson = combineToNdJson(rule);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).toEqual({
          rule_id: '(unknown id)',
          error: { status_code: 400, message: 'threshold: Required' },
        });
      });

      it('should result in partial success if more than 3 threshold fields', async () => {
        const baseRule = getThresholdRuleForAlertTesting(['*']);
        const rule = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            field: ['field-1', 'field-2', 'field-3', 'field-4'],
          },
        };
        const ndjson = combineToNdJson(rule);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).toEqual({
          rule_id: '(unknown id)',
          error: {
            message: 'Number of fields must be 3 or less',
            status_code: 400,
          },
        });
      });

      it('should result in partial success if threshold value is less than 1', async () => {
        const baseRule = getThresholdRuleForAlertTesting(['*']);
        const rule = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            value: 0,
          },
        };
        const ndjson = combineToNdJson(rule);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).toEqual({
          rule_id: '(unknown id)',
          error: {
            message: 'threshold.value: Number must be greater than or equal to 1',
            status_code: 400,
          },
        });
      });

      it('should result in 400 error if cardinality is also an agg field', async () => {
        const baseRule = getThresholdRuleForAlertTesting(['*']);
        const rule = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            cardinality: [
              {
                field: 'process.name',
                value: 5,
              },
            ],
          },
        };
        const ndjson = combineToNdJson(rule);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).toEqual({
          rule_id: '(unknown id)',
          error: {
            message: 'Cardinality of a field that is being aggregated on is always 1',
            status_code: 400,
          },
        });
      });
    });

    describe('forward compatibility', () => {
      it('should remove any extra rule fields when importing', async () => {
        const rule = getCustomQueryRuleParams({
          rule_id: 'rule-1',
          extraField: true,
          risk_score_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              risk_score: 50,
              // @ts-expect-error
              extraField: true,
            },
          ],
          severity_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              severity: 'low',
              // @ts-expect-error
              extraField: true,
            },
          ],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              extraField: true,
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001',
                // @ts-expect-error
                extraField: true,
              },
              technique: [],
            },
          ],
          investigation_fields: {
            field_names: ['host.name'],
            // @ts-expect-error
            extraField: true,
          },
        });
        const ndjson = combineToNdJson(rule);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const importedRule = await fetchRule(supertest, { ruleId: 'rule-1' });

        expect(Object.hasOwn(importedRule, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.risk_score_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.severity_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0].tactic, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.investigation_fields!, 'extraField')).toBeFalsy();
      });
    });

    describe('importing rules with an index', () => {
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
        const ruleToImport = getCustomQueryRuleParams({ rule_id: 'rule-1' });
        const ndjson = combineToNdJson(ruleToImport);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        const importedRule = await fetchRule(supertest, { ruleId: 'rule-1' });

        expect(importedRule).toMatchObject(ruleToImport);
      });

      it('should be able to import two rules', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({ rule_id: 'rule-1' }),
          getCustomQueryRuleParams({ rule_id: 'rule-2' })
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

      it('should report a conflict if there is an attempt to import two rules with the same rule_id', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({ rule_id: 'rule-1' }),
          getCustomQueryRuleParams({ rule_id: 'rule-1' })
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

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
        const existingRule = getCustomQueryRuleParams({ rule_id: 'rule-1' });

        await createRule(supertest, log, existingRule);

        const ndjson = combineToNdJson(existingRule);

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
          success_count: 0,
          rules_count: 1,
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

      it('should give single connector error back if we have a single connector error message', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            actions: [
              {
                group: 'default',
                id: '123',
                action_type_id: '456',
                params: {},
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          success: false,
          success_count: 0,
          rules_count: 1,
          errors: [
            {
              rule_id: 'rule-1',
              id: '123',
              error: {
                status_code: 404,
                message: '1 connector is missing. Connector id missing is: 123',
              },
            },
          ],
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [
            {
              rule_id: 'rule-1',
              id: '123',
              error: {
                status_code: 404,
                message: '1 connector is missing. Connector id missing is: 123',
              },
            },
          ],
        });
      });

      it('should give single connector warning back if we have a single connector missing secret', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf9',
                action_type_id: '.webhook',
                params: {},
              },
            ],
          }),
          {
            id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf9',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.webhook',
              name: 'webhook',
              isMissingSecrets: true,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          }
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_warnings: [
            {
              actionPath: '/app/management/insightsAndAlerting/triggersActionsConnectors',
              buttonLabel: 'Go to connectors',
              message: '1 connector has sensitive information that require updates.',
              type: 'action_required',
            },
          ],
          action_connectors_errors: [],
        });
      });

      it('should be able to import a rule with an action connector that exists', async () => {
        const webHookConnectorParams = getWebHookConnectorParams();
        const connectorId = await createConnector(supertest, webHookConnectorParams);
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            actions: [
              {
                group: 'default',
                id: connectorId,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {},
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
        });
      });

      it('should be able to import 2 rules with action connectors', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57abc6',
                action_type_id: '.webhook',
                params: {},
              },
            ],
          }),
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            actions: [
              {
                group: 'default',
                id: 'f4e74ab0-9e59-11ed-a3db-f9134a9ce951',
                action_type_id: '.index',
                params: {},
              },
            ],
          }),
          {
            id: 'cabc78e0-9031-11ed-b076-53cc4d57abc6',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.webhook',
              name: 'webhook',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          },
          {
            id: 'f4e74ab0-9e59-11ed-a3db-f9134a9ce951',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.index',
              name: 'index',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          }
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          success: true,
          success_count: 2,
          rules_count: 2,
          errors: [],
          action_connectors_success: true,
          action_connectors_success_count: 2,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should be able to import 1 rule with an action connector that exists and get 1 other error back for a second rule that does not have the connector', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57aayo',
                action_type_id: '.webhook',
                params: {},
              },
            ],
          }),
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57aa22', // <-- This does not exist
                action_type_id: '.index',
                params: {},
              },
            ],
          }),
          {
            id: 'cabc78e0-9031-11ed-b076-53cc4d57aayo',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.webhook',
              name: 'webhook',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          }
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          success: false,
          success_count: 0,
          rules_count: 2,
          errors: [
            {
              rule_id: 'rule-2',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aa22',
              error: {
                status_code: 404,
                message:
                  '1 connector is missing. Connector id missing is: cabc78e0-9031-11ed-b076-53cc4d57aa22',
              },
            },
          ],
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_errors: [
            {
              error: {
                status_code: 404,
                message:
                  '1 connector is missing. Connector id missing is: cabc78e0-9031-11ed-b076-53cc4d57aa22',
              },
              rule_id: 'rule-2',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aa22',
            },
          ],
          action_connectors_warnings: [],
        });
      });

      describe('migrate pre-8.0 action connector ids', () => {
        const defaultSpaceActionConnectorId = '61b17790-544e-11ec-a349-11361cc441c4';
        const space714ActionConnectorId = '51b17790-544e-11ec-a349-11361cc441c4';

        beforeEach(async () => {
          await esArchiver.load(
            'x-pack/test/functional/es_archives/security_solution/import_rule_connector'
          );
        });
        afterEach(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/security_solution/import_rule_connector'
          );
        });

        describe('should be imported into the non-default space', () => {
          it('importing a non-default-space 7.16 rule with a connector made in the non-default space should result in a 200', async () => {
            const spaceId = '714-space';
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            const buffer = getImportRuleBuffer(space714ActionConnectorId);

            const { body } = await supertest
              .post(`/s/${spaceId}${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: true,
              success_count: 1,
              errors: [],
            });
          });

          it('should import a non-default-space 7.16 rule with a connector made in the non-default space', async () => {
            const spaceId = '714-space';
            const differentSpaceConnectorId = '5272d090-b111-11ed-b56a-a7991a8d8b32';

            const buffer = getImportRuleWithConnectorsBuffer(differentSpaceConnectorId);
            const { body } = await supertest
              .post(`/s/${spaceId}${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              action_connectors_success: true,
              action_connectors_success_count: 1,
              action_connectors_warnings: [],
              action_connectors_errors: [],
            });
          });
          it('should import a non-default-space 7.16 rule with a connector made in the non-default space into the default space successfully', async () => {
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            const differentSpaceConnectorId = '963ec960-a21a-11ed-84a4-a33e4c2558c9';
            const buffer = getImportRuleWithConnectorsBuffer(differentSpaceConnectorId);

            const { body } = await supertest
              .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              action_connectors_success: true,
              action_connectors_success_count: 1,
              action_connectors_warnings: [],
              action_connectors_errors: [],
            });
          });

          it('importing a non-default-space 7.16 rule with a connector made in the non-default space into the default space should result in a 404 if the file does not contain connectors', async () => {
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            const buffer = getImportRuleBuffer(space714ActionConnectorId);

            const { body } = await supertest
              .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: false,
              errors: [
                expect.objectContaining({
                  error: {
                    status_code: 404,
                    message: `1 connector is missing. Connector id missing is: ${space714ActionConnectorId}`,
                  },
                }),
              ],
            });
          });
          // When objects become share-capable we will either add / update this test
          it('importing a non-default-space 7.16 rule with a connector made in the non-default space into a different non-default space should result in a 404', async () => {
            const spaceId = '4567-space';
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            // it
            const buffer = getImportRuleBuffer(space714ActionConnectorId);

            const { body } = await supertest
              .post(`/s/${spaceId}${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: false,
              errors: [
                expect.objectContaining({
                  error: {
                    status_code: 404,
                    message: `1 connector is missing. Connector id missing is: ${space714ActionConnectorId}`,
                  },
                }),
              ],
            });
          });
        });

        describe('should be imported into the default space', () => {
          it('should import a default-space 7.16 rule with a connector made in the default space into a non-default space successfully', async () => {
            await esArchiver.load(
              'x-pack/test/functional/es_archives/security_solution/import_rule_connector'
            );
            const defaultSpaceConnectorId = '8fbf6d10-a21a-11ed-84a4-a33e4c2558c9';

            const spaceId = '4567-space';
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            // it
            const buffer = getImportRuleWithConnectorsBuffer(defaultSpaceConnectorId);

            const { body } = await supertest
              .post(`/s/${spaceId}${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              action_connectors_success: true,
              action_connectors_success_count: 1,
              action_connectors_warnings: [],
              action_connectors_errors: [],
            });
          });
          // When objects become share-capable we will either add / update this test

          it('importing a default-space 7.16 rule with a connector made in the default space into the default space should result in a 200', async () => {
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            // it
            const buffer = getImportRuleBuffer(defaultSpaceActionConnectorId);

            const { body } = await supertest
              .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: true,
              success_count: 1,
              errors: [],
            });
          });

          it('importing a default-space 7.16 rule with a connector made in the default space into a non-default space should result in a 404', async () => {
            await esArchiver.load(
              'x-pack/test/functional/es_archives/security_solution/import_rule_connector'
            );
            const spaceId = '4567-space';
            // connectorId is from the 7.x connector here
            // x-pack/test/functional/es_archives/security_solution/import_rule_connector
            // it
            const buffer = getImportRuleBuffer(defaultSpaceActionConnectorId);

            const { body } = await supertest
              .post(`/s/${spaceId}${DETECTION_ENGINE_RULES_URL}/_import`)
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .attach('file', buffer, 'rules.ndjson')
              .expect(200);

            expect(body).toMatchObject({
              success: false,
              errors: [
                expect.objectContaining({
                  error: {
                    status_code: 404,
                    message: `1 connector is missing. Connector id missing is: ${defaultSpaceActionConnectorId}`,
                  },
                }),
              ],
            });
          });
        });
      });

      describe('importing with exceptions', () => {
        beforeEach(async () => {
          await deleteAllExceptions(supertest, log);
        });

        /*
          Following the release of version 8.7, this test can be considered as an evaluation of exporting
          an outdated List Item. A notable distinction lies in the absence of the "expire_time" property
          within the getCreateExceptionListMinimalSchemaMock, which allows for differentiation between older
          and newer versions. The rationale behind this approach is the lack of version tracking for both List and Rule,
          thereby enabling simulation of migration scenarios.
        */
        it('should be able to import a rule and an old version exception list, then delete it successfully', async () => {
          const ndjson = combineToNdJson(
            getCustomQueryRuleParams(),
            getImportExceptionsListSchemaMock('test_list_id'),
            getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id')
          );

          // import old exception version
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          expect(body).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          // delete the exception list item by its item_id
          await supertest
            .delete(`${EXCEPTION_LIST_ITEM_URL}?item_id=${'test_item_id'}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);
        });

        it('should be able to import a rule and an exception list', async () => {
          const ndjson = combineToNdJson(
            getCustomQueryRuleParams(),
            getImportExceptionsListSchemaMock('test_list_id'),
            getImportExceptionsListItemNewerVersionSchemaMock('test_item_id', 'test_list_id')
          );

          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          expect(body).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });
        });

        it('should be able to import a rule with both single space and space agnostic exception lists', async () => {
          const ndjson = combineToNdJson(
            getCustomQueryRuleParams({
              exceptions_list: [
                {
                  id: 'agnostic',
                  list_id: 'test_list_agnostic_id',
                  type: 'detection',
                  namespace_type: 'agnostic',
                },
                {
                  id: 'single',
                  list_id: 'test_list_id',
                  type: 'rule_default',
                  namespace_type: 'single',
                },
              ],
            }),
            { ...getImportExceptionsListSchemaMock('test_list_id'), type: 'rule_default' },
            getImportExceptionsListItemNewerVersionSchemaMock('test_item_id', 'test_list_id'),
            {
              ...getImportExceptionsListSchemaMock('test_list_agnostic_id'),
              type: 'detection',
              namespace_type: 'agnostic',
            },
            {
              ...getImportExceptionsListItemNewerVersionSchemaMock(
                'test_item_id',
                'test_list_agnostic_id'
              ),
              namespace_type: 'agnostic',
            }
          );

          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          expect(body).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 2,
          });
        });

        it('should only remove non existent exception list references from rule', async () => {
          // create an exception list
          const { body: exceptionBody } = await supertest
            .post(EXCEPTION_LIST_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...getCreateExceptionListMinimalSchemaMock(),
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            })
            .expect(200);

          const ndjson = combineToNdJson(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: exceptionBody.id,
                  list_id: 'i_exist',
                  type: 'detection',
                  namespace_type: 'single',
                },
                {
                  id: 'i_dont_exist',
                  list_id: '123',
                  type: 'detection',
                  namespace_type: 'single',
                },
              ],
            })
          );

          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          const rule = await fetchRule(supertest, { ruleId: 'rule-1' });

          expect(rule).toMatchObject({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: 'i_exist',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          });

          expect(body).toMatchObject({
            success: false,
            success_count: 1,
            rules_count: 1,
            errors: [
              {
                rule_id: 'rule-1',
                error: {
                  message:
                    'Rule with rule_id: "rule-1" references a non existent exception list of list_id: "123". Reference has been removed.',
                  status_code: 400,
                },
              },
            ],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 0,
          });
        });

        it('should resolve exception references when importing into a clean slate', async () => {
          // So importing a rule that references an exception list
          // Keep in mind, no exception lists or rules exist yet
          const ndjson = combineToNdJson(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: 'abc',
                  list_id: 'i_exist',
                  type: 'detection',
                  namespace_type: 'single',
                },
              ],
            }),
            {
              ...getImportExceptionsListSchemaMock('i_exist'),
              id: 'abc',
              type: 'detection',
              namespace_type: 'single',
            },
            {
              description: 'some description',
              entries: [
                {
                  entries: [
                    {
                      field: 'nested.field',
                      operator: 'included',
                      type: 'match',
                      value: 'some value',
                    },
                  ],
                  field: 'some.parentField',
                  type: 'nested',
                },
                {
                  field: 'some.not.nested.field',
                  operator: 'included',
                  type: 'match',
                  value: 'some value',
                },
              ],
              item_id: 'item_id_1',
              list_id: 'i_exist',
              name: 'Query with a rule id',
              type: 'simple',
            }
          );

          // Importing the "simpleRule", along with the exception list
          // it's referencing and the list's item
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          const importedRule = await fetchRule(supertest, { ruleId: 'rule-1' });
          const referencedExceptionList = importedRule.exceptions_list[0];

          // create an exception list
          const { body: exceptionBody } = await supertest
            .get(
              `${EXCEPTION_LIST_URL}?list_id=${referencedExceptionList.list_id}&id=${referencedExceptionList.id}`
            )
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(importedRule.exceptions_list).toEqual([
            {
              id: exceptionBody.id,
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            },
          ]);

          expect(body).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });
        });

        it('should resolve exception references that include comments', async () => {
          // So importing a rule that references an exception list
          // Keep in mind, no exception lists or rules exist yet
          const ndjson = combineToNdJson(
            getCustomQueryRuleParams({
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: 'abc',
                  list_id: 'i_exist',
                  type: 'detection',
                  namespace_type: 'single',
                },
              ],
            }),
            {
              ...getImportExceptionsListSchemaMock('i_exist'),
              id: 'abc',
              type: 'detection',
              namespace_type: 'single',
            },
            {
              comments: [
                {
                  comment: 'This is an exception to the rule',
                  created_at: '2022-02-04T02:27:40.938Z',
                  created_by: 'elastic',
                  id: '845fc456-91ff-4530-bcc1-5b7ebd2f75b5',
                },
                {
                  comment: 'I decided to add a new comment',
                },
              ],
              description: 'some description',
              entries: [
                {
                  entries: [
                    {
                      field: 'nested.field',
                      operator: 'included',
                      type: 'match',
                      value: 'some value',
                    },
                  ],
                  field: 'some.parentField',
                  type: 'nested',
                },
                {
                  field: 'some.not.nested.field',
                  operator: 'included',
                  type: 'match',
                  value: 'some value',
                },
              ],
              item_id: 'item_id_1',
              list_id: 'i_exist',
              name: 'Query with a rule id',
              type: 'simple',
            }
          );

          // Importing the "simpleRule", along with the exception list
          // it's referencing and the list's item
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', Buffer.from(ndjson), 'rules.ndjson')
            .expect(200);

          const importedRule = await fetchRule(supertest, { ruleId: 'rule-1' });
          const referencedExceptionList = importedRule.exceptions_list[0];

          // create an exception list
          const { body: exceptionBody } = await supertest
            .get(
              `${EXCEPTION_LIST_URL}?list_id=${referencedExceptionList.list_id}&id=${referencedExceptionList.id}`
            )
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(importedRule.exceptions_list).toEqual([
            {
              id: exceptionBody.id,
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            },
          ]);

          const { body: exceptionItemBody } = await supertest
            .get(`${EXCEPTION_LIST_ITEM_URL}?item_id="item_id_1"`)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(exceptionItemBody.comments).toEqual([
            {
              comment: 'This is an exception to the rule',
              created_at: `${exceptionItemBody.comments[0].created_at}`,
              created_by: 'elastic',
              id: `${exceptionItemBody.comments[0].id}`,
            },
            {
              comment: 'I decided to add a new comment',
              created_at: `${exceptionItemBody.comments[1].created_at}`,
              created_by: 'elastic',
              id: `${exceptionItemBody.comments[1].id}`,
            },
          ]);

          expect(body).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });
        });
      });

      it('should import a rule with "investigation_fields', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            investigation_fields: { field_names: ['foo'] },
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });
    });
  });
};
