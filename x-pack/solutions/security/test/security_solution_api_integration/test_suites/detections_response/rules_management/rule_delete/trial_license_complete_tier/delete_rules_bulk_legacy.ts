/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '@kbn/detections-response-ftr-services';
import {
  createLegacyRuleAction,
  getSimpleRule,
  getSlackAction,
  getWebHookAction,
  getLegacyActionSO,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');

  describe('@ess delete_rules_bulk_legacy', () => {
    describe('deleting rules bulk using bulk_action endpoint', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should return the legacy action in the response body when it deletes a rule that has one', async () => {
        // create an action
        const { body: hookAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);

        // create a rule without actions
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // Add a legacy rule action to the body of the rule
        await createLegacyRuleAction(supertest, createRuleBody.id, hookAction.id);

        // delete the rule in bulk using the bulk_actions endpoint
        const { body } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              ids: [createRuleBody.id],
              action: 'delete',
            },
          })
          .expect(200);

        expect(body.attributes.results.deleted.length).toEqual(1);
        // ensure that its actions equal what we expect
        expect(body.attributes.results.deleted[0].actions).toEqual([
          {
            id: hookAction.id,
            action_type_id: hookAction.connector_type_id,
            group: 'default',
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
            uuid: expect.any(String),
          },
        ]);
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should return 2 legacy actions in the response body when it deletes 2 rules', async () => {
        // create two different actions
        const { body: hookAction1 } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);
        const { body: hookAction2 } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);

        // create 2 rules without actions
        const createRuleBody1 = await createRule(supertest, log, getSimpleRule('rule-1'));
        const createRuleBody2 = await createRule(supertest, log, getSimpleRule('rule-2'));

        // Add a legacy rule action to the body of the 2 rules
        await createLegacyRuleAction(supertest, createRuleBody1.id, hookAction1.id);
        await createLegacyRuleAction(supertest, createRuleBody2.id, hookAction2.id);

        // delete the rule in bulk using the bulk_actions endpoint
        const { body } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              ids: [createRuleBody1.id, createRuleBody2.id],
              action: 'delete',
            },
          })
          .expect(200);

        // ensure we only get two bodies back
        expect(body.attributes.results.deleted.length).toEqual(2);

        const actions = body.attributes.results.deleted.map(
          (rule: RuleResponse) => rule.actions[0]
        );

        // ensure that its actions equal what we expect for both responses
        expect(actions).toContainEqual({
          id: hookAction1.id,
          action_type_id: hookAction1.connector_type_id,
          group: 'default',
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          uuid: expect.any(String),
        });
        expect(actions).toContainEqual({
          id: hookAction2.id,
          action_type_id: hookAction2.connector_type_id,
          group: 'default',
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          uuid: expect.any(String),
        });
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should delete a legacy action when it deletes a rule that has one', async () => {
        // create an action
        const { body: hookAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule without actions
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // Add a legacy rule action to the body of the rule
        await createLegacyRuleAction(supertest, createRuleBody.id, hookAction.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).toEqual(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toEqual(
          createRuleBody.id
        );

        // delete the rule in bulk using the bulk_actions endpoint
        await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              ids: [createRuleBody.id],
              action: 'delete',
            },
          })
          .expect(200);

        // Test to ensure that we have exactly 0 legacy actions by querying the Alerting client REST API directly
        // See: https://www.elastic.co/guide/en/kibana/current/find-rules-detectionsApi.html
        // Note: We specifically filter for both the type "siem.notifications" and the "has_reference" field to ensure we only retrieve legacy actions
        const { body: bodyAfterDelete } = await supertest
          .get(`${BASE_ALERTING_API_PATH}/rules/_find`)
          .query({
            page: 1,
            per_page: 10,
            filter: 'alert.attributes.alertTypeId:(siem.notifications)',
            has_reference: JSON.stringify({ id: createRuleBody.id, type: 'alert' }),
          })
          .set('kbn-xsrf', 'true')
          .send();

        // Expect that we have exactly 0 legacy rules after the deletion
        expect(bodyAfterDelete.total).toEqual(0);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).toEqual(0);
      });
    });
  });
};
