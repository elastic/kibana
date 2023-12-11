/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  InvestigationFields,
  QueryRuleCreateProps,
  RuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  toNdJsonString,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
  getImportExceptionsListItemNewerVersionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteAllRules,
  getSimpleRule,
  getSimpleRuleAsNdjson,
  getRulesAsNdjson,
  getSimpleRuleOutput,
  getThresholdRuleForSignalTesting,
  getWebHookAction,
  removeServerGeneratedProperties,
  ruleToNdjson,
  createLegacyRuleAction,
  getLegacyActionSO,
  createRule,
  getRule,
  getRuleSOById,
  deleteAllExceptions,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

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
  const rule1String = JSON.stringify(rule1);
  const buffer = Buffer.from(`${rule1String}\n`);
  return buffer;
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
  const rule1String = JSON.stringify(rule1);
  const connectorString = JSON.stringify(connector);
  const buffer = Buffer.from(`${rule1String}\n${connectorString}`);
  return buffer;
};

export const getSimpleRuleAsNdjsonWithLegacyInvestigationField = (
  ruleIds: string[],
  enabled = false,
  overwrites: Partial<QueryRuleCreateProps>
): Buffer => {
  const stringOfRules = ruleIds.map((ruleId) => {
    const simpleRule = { ...getSimpleRule(ruleId, enabled), ...overwrites };
    return JSON.stringify(simpleRule);
  });
  return Buffer.from(stringOfRules.join('\n'));
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('import_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });
    describe('importing rules with different roles', () => {
      before(async () => {
        await createUserAndRole(getService, ROLES.hunter_no_actions);
        await createUserAndRole(getService, ROLES.hunter);
      });
      after(async () => {
        await deleteUserAndRole(getService, ROLES.hunter_no_actions);
        await deleteUserAndRole(getService, ROLES.hunter);
      });
      it('should successfully import rules without actions when user has no actions privileges', async () => {
        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should not import rules with actions when user has "read" actions privileges', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };
        const ruleWithConnector = {
          id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
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
        };

        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            Buffer.from(toNdJsonString([simpleRule, ruleWithConnector])),
            'rules.ndjson'
          )
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'You may not have actions privileges required to import rules with actions: Unable to bulk_create action',
                status_code: 403,
              },
              rule_id: '(unknown id)',
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_errors: [
            {
              error: {
                message:
                  'You may not have actions privileges required to import rules with actions: Unable to bulk_create action',
                status_code: 403,
              },
              rule_id: '(unknown id)',
            },
          ],
          action_connectors_warnings: [],
        });
      });
      it('should not import rules with actions when a user has no actions privileges', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57axy1',
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };
        const ruleWithConnector = {
          id: 'cabc78e0-9031-11ed-b076-53cc4d57axy1',
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
        };

        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            Buffer.from(toNdJsonString([simpleRule, ruleWithConnector])),
            'rules.ndjson'
          )
          .expect(200);
        expect(body).to.eql({
          success: false,
          success_count: 0,
          errors: [
            {
              error: {
                message:
                  'You may not have actions privileges required to import rules with actions: Unauthorized to get actions',
                status_code: 403,
              },
              rule_id: '(unknown id)',
            },
          ],
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_errors: [
            {
              error: {
                message:
                  'You may not have actions privileges required to import rules with actions: Unauthorized to get actions',
                status_code: 403,
              },
              rule_id: '(unknown id)',
            },
          ],
          action_connectors_warnings: [],
        });
      });
    });

    describe('threshold validation', () => {
      it('should result in partial success if no threshold-specific fields are provided', async () => {
        const { threshold, ...rule } = getThresholdRuleForSignalTesting(['*']);
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(rule as RuleCreateProps), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).to.eql({
          rule_id: '(unknown id)',
          error: { status_code: 400, message: 'threshold: Required' },
        });
      });

      it('should result in partial success if more than 3 threshold fields', async () => {
        const baseRule = getThresholdRuleForSignalTesting(['*']);
        const rule = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            field: ['field-1', 'field-2', 'field-3', 'field-4'],
          },
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(rule), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).to.eql({
          rule_id: '(unknown id)',
          error: {
            message: 'Number of fields must be 3 or less',
            status_code: 400,
          },
        });
      });

      it('should result in partial success if threshold value is less than 1', async () => {
        const baseRule = getThresholdRuleForSignalTesting(['*']);
        const rule = {
          ...baseRule,
          threshold: {
            ...baseRule.threshold,
            value: 0,
          },
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(rule), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).to.eql({
          rule_id: '(unknown id)',
          error: {
            message: 'threshold.value: Number must be greater than or equal to 1',
            status_code: 400,
          },
        });
      });

      it('should result in 400 error if cardinality is also an agg field', async () => {
        const baseRule = getThresholdRuleForSignalTesting(['*']);
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
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(rule), 'rules.ndjson')
          .expect(200);

        expect(body.errors[0]).to.eql({
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
        const rule: QueryRuleCreateProps = {
          ...getSimpleRule('rule-1'),
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
        };
        const payload = Buffer.from(JSON.stringify(rule));
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', payload, 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        expect(Object.hasOwn(body, 'extraField')).to.eql(false);
        expect(Object.hasOwn(body.risk_score_mapping[0], 'extraField')).to.eql(false);
        expect(Object.hasOwn(body.severity_mapping[0], 'extraField')).to.eql(false);
        expect(Object.hasOwn(body.threat[0], 'extraField')).to.eql(false);
        expect(Object.hasOwn(body.threat[0].tactic, 'extraField')).to.eql(false);
        expect(Object.hasOwn(body.investigation_fields, 'extraField')).to.eql(false);
      });
    });

    describe('importing rules with an index', () => {
      it('should set the response content types to be expected', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });

      it('should reject with an error if the file type is not that of a ndjson', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.txt')
          .expect(400);

        expect(body).to.eql({
          status_code: 400,
          message: 'Invalid file extension .txt',
        });
      });

      it('should report that it imported a simple rule successfully', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should be able to read an imported rule back out correctly', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql({
          ...getSimpleRuleOutput('rule-1', false),
          output_index: '',
        });
      });

      it('should be able to import two rules', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
          rules_count: 2,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should report a conflict if there is an attempt to import two rules with the same rule_id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should NOT report a conflict if there is an attempt to import two rules with the same rule_id and overwrite is set to true', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 2,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should NOT report a conflict if there is an attempt to import a rule with a rule_id that already exists and overwrite is set to true', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should overwrite an existing rule if overwrite is set to true', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const simpleRule = getSimpleRule('rule-1');
        simpleRule.name = 'some other name';
        const ndjson = ruleToNdjson(simpleRule);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ndjson, 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleOutput = {
          ...getSimpleRuleOutput('rule-1'),
          output_index: '',
        };
        ruleOutput.name = 'some other name';
        ruleOutput.revision = 0;
        expect(bodyToCompare).to.eql(ruleOutput);
      });

      it('should migrate legacy actions in existing rule if overwrite is set to true', async () => {
        const simpleRule = getSimpleRule('rule-1');

        const [connector, createdRule] = await Promise.all([
          supertest
            .post(`/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: '.slack',
              secrets: {
                webhookUrl: 'http://localhost:1234',
              },
            }),
          createRule(supertest, log, simpleRule),
        ]);
        await createLegacyRuleAction(supertest, createdRule.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
          createdRule.id
        );

        simpleRule.name = 'some other name';
        const ndjson = ruleToNdjson(simpleRule);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ndjson, 'rules.ndjson')
          .expect(200);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
          success_count: 2,
          rules_count: 3,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should report a mix of conflicts and a mix of successes', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
            {
              error: {
                message: 'rule_id: "rule-2" already exists',
                status_code: 409,
              },
              rule_id: 'rule-2',
            },
          ],
          success: false,
          success_count: 1,
          rules_count: 3,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should be able to correctly read back a mixed import of different rules even if some cause conflicts', async () => {
        const simpleRuleOutput = (ruleName: string) => ({
          ...getSimpleRuleOutput(ruleName),
          output_index: '',
        });

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        const { body: bodyOfRule1 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const { body: bodyOfRule2 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-2`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const { body: bodyOfRule3 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-3`)
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompareOfRule1 = removeServerGeneratedProperties(bodyOfRule1);
        const bodyToCompareOfRule2 = removeServerGeneratedProperties(bodyOfRule2);
        const bodyToCompareOfRule3 = removeServerGeneratedProperties(bodyOfRule3);

        expect([bodyToCompareOfRule1, bodyToCompareOfRule2, bodyToCompareOfRule3]).to.eql([
          simpleRuleOutput('rule-1'),
          simpleRuleOutput('rule-2'),
          simpleRuleOutput('rule-3'),
        ]);
      });

      it('should give single connector error back if we have a single connector error message', async () => {
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: '123',
              action_type_id: '456',
              params: {},
            },
          ],
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
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
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf9',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        };
        const ruleWithConnector = {
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
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            Buffer.from(toNdJsonString([simpleRule, ruleWithConnector])),
            'rules.ndjson'
          )
          .expect(200);

        expect(body).to.eql({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
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
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);
        expect(body).to.eql({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should be able to import 2 rules with action connectors', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57abc6',
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [
            {
              group: 'default',
              id: 'f4e74ab0-9e59-11ed-a3db-f9134a9ce951',
              action_type_id: '.index',
              params: {},
            },
          ],
        };

        const connector1 = {
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
        };
        const connector2 = {
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
        };
        const rule1String = JSON.stringify(rule1);
        const rule2String = JSON.stringify(rule2);
        const connector12String = JSON.stringify(connector1);
        const connector22String = JSON.stringify(connector2);
        const buffer = Buffer.from(
          `${rule1String}\n${rule2String}\n${connector12String}\n${connector22String}\n`
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', buffer, 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          success: true,
          success_count: 2,
          rules_count: 2,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 2,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should be able to import 1 rule with an action connector that exists and get 1 other error back for a second rule that does not have the connector', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aayo',
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aa22', // <-- This does not exist
              action_type_id: '.index',
              params: {},
            },
          ],
        };

        const connector = {
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
        };

        const rule1String = JSON.stringify(rule1);
        const rule2String = JSON.stringify(rule2);
        const connector2String = JSON.stringify(connector);

        const buffer = Buffer.from(`${rule1String}\n${rule2String}\n${connector2String}\n`);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', buffer, 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
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
            expect(body.success).to.eql(true);
            expect(body.success_count).to.eql(1);
            expect(body.errors.length).to.eql(0);
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

            expect(body).to.eql({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              exceptions_errors: [],
              exceptions_success: true,
              exceptions_success_count: 0,
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
            expect(body).to.eql({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              exceptions_errors: [],
              exceptions_success: true,
              exceptions_success_count: 0,
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
            expect(body.success).to.equal(false);
            expect(body.errors[0].error.status_code).to.equal(404);
            expect(body.errors[0].error.message).to.equal(
              `1 connector is missing. Connector id missing is: ${space714ActionConnectorId}`
            );
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
            expect(body.success).to.equal(false);
            expect(body.errors[0].error.status_code).to.equal(404);
            expect(body.errors[0].error.message).to.equal(
              `1 connector is missing. Connector id missing is: ${space714ActionConnectorId}`
            );
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
            expect(body).to.eql({
              success: true,
              success_count: 1,
              rules_count: 1,
              errors: [],
              exceptions_errors: [],
              exceptions_success: true,
              exceptions_success_count: 0,
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
            expect(body.success).to.equal(true);
            expect(body.success_count).to.eql(1);
            expect(body.errors.length).to.eql(0);
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
            expect(body.success).to.equal(false);
            expect(body.errors[0].error.status_code).to.equal(404);
            expect(body.errors[0].error.message).to.equal(
              `1 connector is missing. Connector id missing is: ${defaultSpaceActionConnectorId}`
            );
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
          const simpleRule = getSimpleRule('rule-1');

          // import old exception version
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach(
              'file',
              Buffer.from(
                toNdJsonString([
                  simpleRule,
                  getImportExceptionsListSchemaMock('test_list_id'),
                  getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
                ])
              ),
              'rules.ndjson'
            )
            .expect(200);
          expect(body).to.eql({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
            action_connectors_success: true,
            action_connectors_success_count: 0,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });

          // delete the exception list item by its item_id
          await supertest
            .delete(`${EXCEPTION_LIST_ITEM_URL}?item_id=${'test_item_id'}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);
        });

        it('should be able to import a rule and an exception list', async () => {
          const simpleRule = getSimpleRule('rule-1');

          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach(
              'file',
              Buffer.from(
                toNdJsonString([
                  simpleRule,
                  getImportExceptionsListSchemaMock('test_list_id'),
                  getImportExceptionsListItemNewerVersionSchemaMock('test_item_id', 'test_list_id'),
                ])
              ),
              'rules.ndjson'
            )
            .expect(200);
          expect(body).to.eql({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
            action_connectors_success: true,
            action_connectors_success_count: 0,
            action_connectors_errors: [],
            action_connectors_warnings: [],
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

          const simpleRule: ReturnType<typeof getSimpleRule> = {
            ...getSimpleRule('rule-1'),
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
          };
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
            .expect(200);

          const { body: ruleResponse } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
            .set('elastic-api-version', '2023-10-31')
            .send()
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          expect(bodyToCompare.exceptions_list).to.eql([
            {
              id: exceptionBody.id,
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            },
          ]);

          expect(body).to.eql({
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
            action_connectors_success: true,
            action_connectors_success_count: 0,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });
        });

        it('should resolve exception references when importing into a clean slate', async () => {
          // So importing a rule that references an exception list
          // Keep in mind, no exception lists or rules exist yet
          const simpleRule: ReturnType<typeof getSimpleRule> = {
            ...getSimpleRule('rule-1'),
            exceptions_list: [
              {
                id: 'abc',
                list_id: 'i_exist',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          };

          // Importing the "simpleRule", along with the exception list
          // it's referencing and the list's item
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach(
              'file',
              Buffer.from(
                toNdJsonString([
                  simpleRule,
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
                  },
                ])
              ),
              'rules.ndjson'
            )
            .expect(200);

          const { body: ruleResponse } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
            .set('elastic-api-version', '2023-10-31')
            .send()
            .expect(200);
          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          const referencedExceptionList = ruleResponse.exceptions_list[0];

          // create an exception list
          const { body: exceptionBody } = await supertest
            .get(
              `${EXCEPTION_LIST_URL}?list_id=${referencedExceptionList.list_id}&id=${referencedExceptionList.id}`
            )
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(bodyToCompare.exceptions_list).to.eql([
            {
              id: exceptionBody.id,
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            },
          ]);

          expect(body).to.eql({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
            action_connectors_success: true,
            action_connectors_success_count: 0,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });
        });

        it('should resolve exception references that include comments', async () => {
          // So importing a rule that references an exception list
          // Keep in mind, no exception lists or rules exist yet
          const simpleRule: ReturnType<typeof getSimpleRule> = {
            ...getSimpleRule('rule-1'),
            exceptions_list: [
              {
                id: 'abc',
                list_id: 'i_exist',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          };

          // Importing the "simpleRule", along with the exception list
          // it's referencing and the list's item
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .attach(
              'file',
              Buffer.from(
                toNdJsonString([
                  simpleRule,
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
                  },
                ])
              ),
              'rules.ndjson'
            )
            .expect(200);

          const { body: ruleResponse } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
            .set('elastic-api-version', '2023-10-31')
            .send()
            .expect(200);
          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          const referencedExceptionList = ruleResponse.exceptions_list[0];

          // create an exception list
          const { body: exceptionBody } = await supertest
            .get(
              `${EXCEPTION_LIST_URL}?list_id=${referencedExceptionList.list_id}&id=${referencedExceptionList.id}`
            )
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(bodyToCompare.exceptions_list).to.eql([
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

          expect(exceptionItemBody.comments).to.eql([
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

          expect(body).to.eql({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
            action_connectors_success: true,
            action_connectors_success_count: 0,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });
        });
      });

      it('should import a rule with "investigation_fields', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            getRulesAsNdjson([
              { ...getSimpleRule(), investigation_fields: { field_names: ['foo'] } },
            ]),
            'rules.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });
    });

    describe('legacy investigation fields', () => {
      it('imports rule with investigation fields as array', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            getSimpleRuleAsNdjsonWithLegacyInvestigationField(['rule-1'], false, {
              // mimicking what an 8.10 rule would look like
              // we don't want to support this type in our APIs any longer, but do
              // want to allow users to import rules from 8.10
              investigation_fields: ['foo', 'bar'] as unknown as InvestigationFields,
            }),
            'rules.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await getRule(supertest, log, 'rule-1');
        expect(rule.investigation_fields).to.eql({ field_names: ['foo', 'bar'] });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, rule.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql({ field_names: ['foo', 'bar'] });
      });

      it('imports rule with investigation fields as empty array', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            getSimpleRuleAsNdjsonWithLegacyInvestigationField(['rule-1'], false, {
              // mimicking what an 8.10 rule would look like
              // we don't want to support this type in our APIs any longer, but do
              // want to allow users to import rules from 8.10
              investigation_fields: [] as unknown as InvestigationFields,
            }),
            'rules.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await getRule(supertest, log, 'rule-1');
        expect(rule.investigation_fields).to.eql(undefined);
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, rule.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql(undefined);
      });

      it('imports rule with investigation fields as intended object type', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach(
            'file',
            getSimpleRuleAsNdjsonWithLegacyInvestigationField(['rule-1'], false, {
              investigation_fields: {
                field_names: ['foo'],
              },
            }),
            'rules.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await getRule(supertest, log, 'rule-1');
        expect(rule.investigation_fields).to.eql({ field_names: ['foo'] });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, rule.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql({ field_names: ['foo'] });
      });
    });
  });
};
