/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
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

  describe('@ess Legacy route for deleting rules', () => {
    describe('deleting rules', () => {
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
      it('should have exactly 1 legacy action before a delete within alerting', async () => {
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

        // Test to ensure that we have exactly 1 legacy action by querying the Alerting client REST API directly
        // See: https://www.elastic.co/guide/en/kibana/current/find-rules-api.html
        // Note: We specifically query for both the filter of type "siem.notifications" and the "has_reference" to keep it very specific
        const { body: alertFind } = await supertest
          .get(`${BASE_ALERTING_API_PATH}/rules/_find`)
          .query({
            page: 1,
            per_page: 10,
            filter: 'alert.attributes.alertTypeId:(siem.notifications)',
            has_reference: JSON.stringify({ id: createRuleBody.id, type: 'alert' }),
          })
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Expect that we have exactly 1 legacy rule before the deletion
        expect(alertFind.total).to.eql(1);
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
          .delete(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        // ensure the actions contains the response
        expect(body.actions).to.eql([
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

        await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        // Test to ensure that we have exactly 0 legacy actions by querying the Alerting client REST API directly
        // See: https://www.elastic.co/guide/en/kibana/current/find-rules-api.html
        // Note: We specifically query for both the filter of type "siem.notifications" and the "has_reference" to keep it very specific
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
