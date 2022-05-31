/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleUpdate,
  getSimpleMlRuleUpdate,
  createRule,
  getSimpleRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('update_rules', () => {
    describe('update rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should return a 403 forbidden if it is a machine learning job', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's type to try to be a machine learning job type
        const updatedRule = getSimpleMlRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(403);

        expect(body).to.eql({
          message: 'Your license does not support machine learning. Please upgrade your license.',
          status_code: 403,
        });
      });

      it('should update a single rule property of name using an auto-generated rule_id', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const createRuleBody = await createRule(supertest, log, rule);

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = createRuleBody.rule_id;
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.name = 'some other name';
        updatedRule.id = createdBody.id;
        delete updatedRule.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the version of a rule when it updates enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's enabled to false and another property
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.severity = 'low';
        updatedRule.enabled = false;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedRule)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change other properties when it does updates and effectively delete them such as timeline_title', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        // update a simple rule's timeline_title
        await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate)
          .expect(200);

        const ruleUpdate2 = getSimpleRuleUpdate('rule-1');
        ruleUpdate2.name = 'some other name';

        // update a simple rule's name
        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleUpdate2)
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 3;

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.id = '5096dec6-b6b9-4d8d-8f93-6c2602079d9d';
        delete simpleRule.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.rule_id = 'fake_id';
        delete simpleRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(simpleRule)
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });
    });
  });
};
