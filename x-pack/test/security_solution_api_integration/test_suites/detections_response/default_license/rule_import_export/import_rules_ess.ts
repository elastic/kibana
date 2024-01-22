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
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { toNdJsonString } from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import {
  deleteAllRules,
  getSimpleRule,
  ruleToNdjson,
  createLegacyRuleAction,
  getLegacyActionSO,
  createRule,
  fetchRule,
  getWebHookAction,
  getSimpleRuleAsNdjson,
  checkInvestigationFieldSoValue,
} from '../../utils';
import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../common/services/security_solution';
import { FtrProviderContext } from '../../../../ftr_provider_context';

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

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess import_rules - ESS specific logic', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
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
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(createdRule.id);

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

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        expect(rule.investigation_fields).to.eql({ field_names: ['foo', 'bar'] });

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['foo', 'bar'] },
          es,
          rule.id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(true);
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

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        expect(rule.investigation_fields).to.eql(undefined);

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          undefined,
          es,
          rule.id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(true);
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

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        expect(rule.investigation_fields).to.eql({ field_names: ['foo'] });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * include a migration on SO.
         */
        const isInvestigationFieldIntendedTypeInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['foo'] },
          es,
          rule.id
        );
        expect(isInvestigationFieldIntendedTypeInSo).to.eql(true);
      });
    });
  });
};
