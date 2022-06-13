/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleMlRuleOutput,
  createRule,
  getSimpleMlRule,
  createLegacyRuleAction,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('patch_rules', () => {
    describe('patch rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should patch a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it("should patch a machine_learning rule's job ID if in a legacy format", async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', machine_learning_job_id: 'some_job_id' })
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using a rule_id of type "machine learning"', async () => {
        await createRule(supertest, log, getSimpleMlRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleMlRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using the auto-generated rule_id', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const createRuleBody = await createRule(supertest, log, rule);

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: createRuleBody.rule_id, name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: createdBody.id, name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change the version of a rule when it patches only enabled', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', enabled: false })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the version of a rule when it patches enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false and another property
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', severity: 'low', enabled: false })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change other properties when it does patches', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's timeline_title
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' })
          .expect(200);

        // patch a simple rule's name
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: 'some other name' })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.timeline_title = 'some title';
        outputRule.timeline_id = 'some id';
        outputRule.version = 3;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should return the rule with migrated actions after the enable patch', async () => {
        const [connector, rule] = await Promise.all([
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
          createRule(supertest, log, getSimpleRule('rule-1')),
        ]);
        await createLegacyRuleAction(supertest, rule.id, connector.body.id);

        // patch disable the rule
        const patchResponse = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: rule.id, enabled: false })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.actions = [
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
          },
        ];
        outputRule.throttle = '1h';
        const bodyToCompare = removeServerGeneratedProperties(patchResponse.body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'fake_id', name: 'some other name' })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });
    });
  });
};
