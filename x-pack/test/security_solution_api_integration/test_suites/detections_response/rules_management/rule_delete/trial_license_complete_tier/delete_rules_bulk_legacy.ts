/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { DETECTION_ENGINE_RULES_BULK_DELETE } from '@kbn/security-solution-plugin/common/constants';
import {
  createLegacyRuleAction,
  getSimpleRule,
  getSlackAction,
  getWebHookAction,
  getLegacyActionSO,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess delete_rules_bulk_legacy', () => {
    describe('deleting rules bulk using POST', () => {
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
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);

        // create a rule without actions
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // Add a legacy rule action to the body of the rule
        await createLegacyRuleAction(supertest, createRuleBody.id, hookAction.id);

        // delete the rule with the legacy action
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: createRuleBody.id }])
          .expect(200);

        // ensure we only get one body back
        expect(body.length).to.eql(1);

        // ensure that its actions equal what we expect
        expect(body[0].actions).to.eql([
          {
            id: hookAction.id,
            action_type_id: hookAction.actionTypeId,
            group: 'default',
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should return 2 legacy actions in the response body when it deletes 2 rules', async () => {
        // create two different actions
        const { body: hookAction1 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);
        const { body: hookAction2 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getSlackAction())
          .expect(200);

        // create 2 rules without actions
        const createRuleBody1 = await createRule(supertest, log, getSimpleRule('rule-1'));
        const createRuleBody2 = await createRule(supertest, log, getSimpleRule('rule-2'));

        // Add a legacy rule action to the body of the 2 rules
        await createLegacyRuleAction(supertest, createRuleBody1.id, hookAction1.id);
        await createLegacyRuleAction(supertest, createRuleBody2.id, hookAction2.id);

        // delete 2 rules where both have legacy actions
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: createRuleBody1.id }, { id: createRuleBody2.id }])
          .expect(200);

        // ensure we only get two bodies back
        expect(body.length).to.eql(2);

        // ensure that its actions equal what we expect for both responses
        expect(body[0].actions).to.eql([
          {
            id: hookAction1.id,
            action_type_id: hookAction1.actionTypeId,
            group: 'default',
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
        expect(body[1].actions).to.eql([
          {
            id: hookAction2.id,
            action_type_id: hookAction2.actionTypeId,
            group: 'default',
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should delete a legacy action when it deletes a rule that has one', async () => {
        // create an action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule without actions
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // Add a legacy rule action to the body of the rule
        await createLegacyRuleAction(supertest, createRuleBody.id, hookAction.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
          createRuleBody.id
        );

        // bulk delete the rule
        await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: createRuleBody.id }])
          .expect(200);

        // Test to ensure that we have exactly 0 legacy actions by querying the Alerting client REST API directly
        // See: https://www.elastic.co/guide/en/kibana/current/find-rules-api.html
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
        expect(bodyAfterDelete.total).to.eql(0);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);
      });
    });
  });
};
