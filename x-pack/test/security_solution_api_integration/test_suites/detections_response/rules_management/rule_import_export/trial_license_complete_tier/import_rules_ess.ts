/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import {
  createLegacyRuleAction,
  getLegacyActionSO,
  fetchRule,
  checkInvestigationFieldSoValue,
  combineToNdJson,
  getCustomQueryRuleParams,
} from '../../../utils';
import { deleteAllRules, createRule } from '../../../../../../common/utils/security_solution';
import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../common/services/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createConnector } from '../../../utils/connectors';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';

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
      const ruleToOverwrite = getCustomQueryRuleParams({
        rule_id: 'rule-1',
        interval: '1h', // action frequency can't be shorter than the schedule interval
      });

      const [connectorId, createdRule] = await Promise.all([
        createConnector(supertest, {
          name: 'My action',
          connector_type_id: '.slack',
          config: {},
          secrets: {
            webhookUrl: 'http://localhost:1234',
          },
        }),
        createRule(supertest, log, ruleToOverwrite),
      ]);
      await createLegacyRuleAction(supertest, createdRule.id, connectorId);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);

      expect(sidecarActionsResults.hits.hits.length).toBe(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(createdRule.id);

      const ndjson = combineToNdJson(
        getCustomQueryRuleParams({ rule_id: 'rule-1', name: 'some other name' })
      );

      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .attach('file', Buffer.from(ndjson), 'rules.ndjson')
        .expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);

      expect(sidecarActionsPostResults.hits.hits.length).toBe(0);
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
        const ndjson = combineToNdJson(getCustomQueryRuleParams());

        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      it('should NOT import rules with actions when user has "read" actions privileges', async () => {
        const connectorId = await createConnector(supertest, getWebHookConnectorParams());
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-with-actions',
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
                action_type_id: connectorId,
                params: {},
              },
            ],
          }),
          {
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
          }
        );

        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
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

      it('should NOT import rules with actions when a user has no actions privileges', async () => {
        const connectorId = await createConnector(supertest, getWebHookConnectorParams());
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-with-actions',
            actions: [
              {
                group: 'default',
                id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
                action_type_id: connectorId,
                params: {},
              },
            ],
          }),
          {
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
          }
        );

        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
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
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            ruleId: 'rule-1',
            // mimicking what an 8.10 rule would look like
            // we don't want to support this type in our APIs any longer, but do
            // want to allow users to import rules from 8.10
            // @ts-expect-error
            investigation_fields: ['foo', 'bar'],
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });

        expect(rule.investigation_fields).toEqual({ field_names: ['foo', 'bar'] });

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
        expect(isInvestigationFieldMigratedInSo).toBeTruthy();
      });

      it('imports rule with investigation fields as empty array', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            ruleId: 'rule-1',
            // mimicking what an 8.10 rule would look like
            // we don't want to support this type in our APIs any longer, but do
            // want to allow users to import rules from 8.10
            // @ts-expect-error
            investigation_fields: [],
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });

        expect(rule.investigation_fields).toBeUndefined();

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
        expect(isInvestigationFieldMigratedInSo).toBeTruthy();
      });

      it('imports rule with investigation fields as intended object type', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            investigation_fields: {
              field_names: ['foo'],
            },
          })
        );

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });

        expect(rule.investigation_fields).toEqual({ field_names: ['foo'] });
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
        expect(isInvestigationFieldIntendedTypeInSo).toBeTruthy();
      });
    });
  });
};
