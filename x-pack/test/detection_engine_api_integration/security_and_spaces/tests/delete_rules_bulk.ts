/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { BASE_ALERTING_API_PATH } from '../../../../plugins/alerting/common';
import { DETECTION_ENGINE_RULES_BULK_DELETE } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createLegacyRuleAction,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  getWebHookAction,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('delete_rules_bulk', () => {
    describe('deprecations', () => {
      it('should return a warning header', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { header } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .send([{ rule_id: 'rule-1' }])
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_delete API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

    describe('deleting rules bulk using DELETE', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        // delete the rule in bulk
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .send([{ rule_id: 'rule-1' }])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its rule_id
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ rule_id: bodyWithCreatedRule.rule_id }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its id
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: bodyWithCreatedRule.id }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ rule_id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should return an error if the id does not exist when trying to delete an id', async () => {
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'id: "c4e80a0d-e20f-4efc-84c1-08112da5a612" not found',
              status_code: 404,
            },
            id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
          },
        ]);
      });

      it('should delete a single rule using an auto generated rule_id but give an error if the second rule does not exist', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: bodyWithCreatedRule.id }, { id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          getSimpleRuleOutputWithoutRuleId(),
          {
            id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
            error: {
              status_code: 404,
              message: 'id: "c4e80a0d-e20f-4efc-84c1-08112da5a612" not found',
            },
          },
        ]);
      });
    });

    // This is a repeat of the tests above but just using POST instead of DELETE
    describe('deleting rules bulk using POST', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        // delete the rule in bulk
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .send([{ rule_id: 'rule-1' }])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its rule_id
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ rule_id: bodyWithCreatedRule.rule_id }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its id
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: bodyWithCreatedRule.id }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ rule_id: 'fake_id' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should return an error if the id does not exist when trying to delete an id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'id: "c4e80a0d-e20f-4efc-84c1-08112da5a612" not found',
              status_code: 404,
            },
            id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
          },
        ]);
      });

      it('should delete a single rule using an auto generated rule_id but give an error if the second rule does not exist', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: bodyWithCreatedRule.id }, { id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          getSimpleRuleOutputWithoutRuleId(),
          {
            id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
            error: {
              status_code: 404,
              message: 'id: "c4e80a0d-e20f-4efc-84c1-08112da5a612" not found',
            },
          },
        ]);
      });

      /**
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      it('should return the legacy action in the response body when it deletes a rule that has one', async () => {
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

        // delete the rule with the legacy action
        const { body } = await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: createRuleBody.id }])
          .set('kbn-xsrf', 'true')
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
          .send(getWebHookAction())
          .expect(200);
        const { body: hookAction2 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
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
          .send([{ id: createRuleBody1.id }, { id: createRuleBody2.id }])
          .set('kbn-xsrf', 'true')
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

        // bulk delete the rule
        await supertest
          .delete(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ id: createRuleBody.id }])
          .set('kbn-xsrf', 'true')
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
      });
    });
  });
};
