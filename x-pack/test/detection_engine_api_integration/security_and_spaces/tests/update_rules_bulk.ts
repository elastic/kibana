/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  getSimpleRuleOutputWithoutRuleId,
  removeServerGeneratedPropertiesIncludingRuleId,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('update_rules_bulk', () => {
    describe('update rules bulk', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        const updatedRule = getSimpleRule('rule-1');
        updatedRule.name = 'some other name';

        // update a simple rule's name
        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update two rule properties of name using the two rules rule_id', async () => {
        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // create a second simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-2'))
          .expect(200);

        const updatedRule1 = getSimpleRule('rule-1');
        updatedRule1.name = 'some other name';

        const updatedRule2 = getSimpleRule('rule-2');
        updatedRule2.name = 'some other name';

        // update both rule names
        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1, updatedRule2])
          .expect(200);

        const outputRule1 = getSimpleRuleOutput();
        outputRule1.name = 'some other name';
        outputRule1.version = 2;

        const outputRule2 = getSimpleRuleOutput('rule-2');
        outputRule2.name = 'some other name';
        outputRule2.version = 2;

        const bodyToCompare1 = removeServerGeneratedProperties(body[0]);
        const bodyToCompare2 = removeServerGeneratedProperties(body[1]);
        expect([bodyToCompare1, bodyToCompare2]).to.eql([outputRule1, outputRule2]);
      });

      it('should update a single rule property of name using an id', async () => {
        // create a simple rule
        const { body: createRuleBody } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // update a simple rule's name
        const updatedRule1 = getSimpleRule('rule-1');
        updatedRule1.id = createRuleBody.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should update two rule properties of name using the two rules id', async () => {
        // create a simple rule
        const { body: createRule1 } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // create a second simple rule
        const { body: createRule2 } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-2'))
          .expect(200);

        // update both rule names
        const updatedRule1 = getSimpleRule('rule-1');
        updatedRule1.id = createRule1.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const updatedRule2 = getSimpleRule('rule-1');
        updatedRule2.id = createRule2.id;
        updatedRule2.name = 'some other name';
        delete updatedRule2.rule_id;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1, updatedRule2])
          .expect(200);

        const outputRule1 = getSimpleRuleOutputWithoutRuleId('rule-1');
        outputRule1.name = 'some other name';
        outputRule1.version = 2;

        const outputRule2 = getSimpleRuleOutputWithoutRuleId('rule-2');
        outputRule2.name = 'some other name';
        outputRule2.version = 2;

        const bodyToCompare1 = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const bodyToCompare2 = removeServerGeneratedPropertiesIncludingRuleId(body[1]);
        expect([bodyToCompare1, bodyToCompare2]).to.eql([outputRule1, outputRule2]);
      });

      it('should update a single rule property of name using the auto-generated id', async () => {
        // create a simple rule
        const { body: createdBody } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // update a simple rule's name
        const updatedRule1 = getSimpleRule('rule-1');
        updatedRule1.id = createdBody.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the version of a rule when it updates enabled and another property', async () => {
        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // update a simple rule's enabled to false and another property
        const updatedRule1 = getSimpleRule('rule-1');
        updatedRule1.severity = 'low';
        updatedRule1.enabled = false;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change other properties when it does updates and effectively delete them such as timeline_title', async () => {
        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // update a simple rule's timeline_title
        const ruleUpdate = getSimpleRule('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate])
          .expect(200);

        // update a simple rule's name
        const ruleUpdate2 = getSimpleRule('rule-1');
        ruleUpdate2.name = 'some other name';

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate2])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 3;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake id', async () => {
        const ruleUpdate = getSimpleRule('rule-1');
        ruleUpdate.id = 'fake_id';
        delete ruleUpdate.rule_id;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate])
          .expect(200);

        expect(body).to.eql([
          { rule_id: 'fake_id', error: { status_code: 404, message: 'id: "fake_id" not found' } },
        ]);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake rule_id', async () => {
        const ruleUpdate = getSimpleRule('rule-1');
        ruleUpdate.rule_id = 'fake_id';
        delete ruleUpdate.id;

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate])
          .expect(200);

        expect(body).to.eql([
          {
            rule_id: 'fake_id',
            error: { status_code: 404, message: 'rule_id: "fake_id" not found' },
          },
        ]);
      });

      it('should update one rule property and give an error about a second fake rule_id', async () => {
        // create a simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        const ruleUpdate = getSimpleRule('rule-1');
        ruleUpdate.name = 'some other name';
        delete ruleUpdate.id;

        const ruleUpdate2 = getSimpleRule('fake_id');
        ruleUpdate2.name = 'some other name';
        delete ruleUpdate.id;

        // update one rule name and give a fake id for the second
        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate, ruleUpdate2])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          outputRule,
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should update one rule property and give an error about a second fake id', async () => {
        // create a simple rule
        const { body: createdBody } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // update one rule name and give a fake id for the second
        const rule1 = getSimpleRule();
        delete rule1.rule_id;
        rule1.id = createdBody.id;
        rule1.name = 'some other name';

        const rule2 = getSimpleRule();
        delete rule2.rule_id;
        rule2.id = 'fake_id';
        rule2.name = 'some other name';

        const { body } = await supertest
          .put(`${DETECTION_ENGINE_RULES_URL}/_bulk_update`)
          .set('kbn-xsrf', 'true')
          .send([rule1, rule2])
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.version = 2;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          outputRule,
          {
            error: {
              message: 'id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id', // TODO: This should be id and not rule_id in the codebase
          },
        ]);
      });
    });
  });
};
