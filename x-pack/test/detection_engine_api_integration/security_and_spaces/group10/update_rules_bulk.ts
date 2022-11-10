/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RuleResponse } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_BULK_UPDATE,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  getSimpleRuleUpdate,
  createRule,
  getSimpleRule,
  createLegacyRuleAction,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('update_rules_bulk', () => {
    describe('deprecations', () => {
      afterEach(async () => {
        await deleteAllAlerts(supertest, log);
      });

      it('should return a warning header', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        const updatedRule = getSimpleRuleUpdate('rule-1');

        const { header } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([updatedRule])
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_update API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

    describe('update rules bulk', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.name = 'some other name';

        // update a simple rule's name
        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // create a second simple rule
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRuleUpdate('rule-2'))
          .expect(200);

        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.name = 'some other name';

        const updatedRule2 = getSimpleRuleUpdate('rule-2');
        updatedRule2.name = 'some other name';

        // update both rule names
        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        expect(bodyToCompare1).to.eql(outputRule1);
        expect(bodyToCompare2).to.eql(outputRule2);
      });

      it('should update two rule properties of name using the two rules rule_id and migrate actions', async () => {
        const connector = await supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          });
        const action1 = {
          group: 'default',
          id: connector.body.id,
          action_type_id: connector.body.connector_type_id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
        };
        const [rule1, rule2] = await Promise.all([
          createRule(supertest, log, { ...getSimpleRule('rule-1'), actions: [action1] }),
          createRule(supertest, log, { ...getSimpleRule('rule-2'), actions: [action1] }),
        ]);
        await Promise.all([
          createLegacyRuleAction(supertest, rule1.id, connector.body.id),
          createLegacyRuleAction(supertest, rule2.id, connector.body.id),
        ]);

        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.name = 'some other name';
        updatedRule1.actions = [action1];
        updatedRule1.throttle = '1d';

        const updatedRule2 = getSimpleRuleUpdate('rule-2');
        updatedRule2.name = 'some other name';
        updatedRule2.actions = [action1];
        updatedRule2.throttle = '1d';

        // update both rule names
        const { body }: { body: RuleResponse[] } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1, updatedRule2])
          .expect(200);

        body.forEach((response) => {
          const outputRule = getSimpleRuleOutput(response.rule_id);
          outputRule.name = 'some other name';
          outputRule.version = 2;
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
          outputRule.throttle = '1d';
          const bodyToCompare = removeServerGeneratedProperties(response);
          expect(bodyToCompare).to.eql(outputRule);
        });
      });

      it('should update two rule properties of name using the two rules rule_id and remove actions', async () => {
        const connector = await supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          });
        const action1 = {
          group: 'default',
          id: connector.body.id,
          action_type_id: connector.body.connector_type_id,
          params: {
            message: 'message',
          },
        };
        const [rule1, rule2] = await Promise.all([
          createRule(supertest, log, { ...getSimpleRule('rule-1'), actions: [action1] }),
          createRule(supertest, log, { ...getSimpleRule('rule-2'), actions: [action1] }),
        ]);
        await Promise.all([
          createLegacyRuleAction(supertest, rule1.id, connector.body.id),
          createLegacyRuleAction(supertest, rule2.id, connector.body.id),
        ]);

        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.name = 'some other name';

        const updatedRule2 = getSimpleRuleUpdate('rule-2');
        updatedRule2.name = 'some other name';

        // update both rule names
        const { body }: { body: RuleResponse[] } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1, updatedRule2])
          .expect(200);

        body.forEach((response) => {
          const outputRule = getSimpleRuleOutput(response.rule_id);
          outputRule.name = 'some other name';
          outputRule.version = 2;
          outputRule.actions = [];
          outputRule.throttle = 'no_actions';
          const bodyToCompare = removeServerGeneratedProperties(response);
          expect(bodyToCompare).to.eql(outputRule);
        });
      });

      it('should update a single rule property of name using an id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.id = createRuleBody.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        const createRule1 = await createRule(supertest, log, getSimpleRule('rule-1'));
        const createRule2 = await createRule(supertest, log, getSimpleRule('rule-2'));

        // update both rule names
        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.id = createRule1.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const updatedRule2 = getSimpleRuleUpdate('rule-1');
        updatedRule2.id = createRule2.id;
        updatedRule2.name = 'some other name';
        delete updatedRule2.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([updatedRule1, updatedRule2])
          .expect(200);

        const outputRule1 = getSimpleRuleOutput('rule-1');
        outputRule1.name = 'some other name';
        outputRule1.version = 2;

        const outputRule2 = getSimpleRuleOutput('rule-2');
        outputRule2.name = 'some other name';
        outputRule2.version = 2;

        const bodyToCompare1 = removeServerGeneratedProperties(body[0]);
        const bodyToCompare2 = removeServerGeneratedProperties(body[1]);
        expect(bodyToCompare1).to.eql(outputRule1);
        expect(bodyToCompare2).to.eql(outputRule2);
      });

      it('should update a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.id = createdBody.id;
        updatedRule1.name = 'some other name';
        delete updatedRule1.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's enabled to false and another property
        const updatedRule1 = getSimpleRuleUpdate('rule-1');
        updatedRule1.severity = 'low';
        updatedRule1.enabled = false;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's timeline_title
        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate])
          .expect(200);

        // update a simple rule's name
        const ruleUpdate2 = getSimpleRuleUpdate('rule-1');
        ruleUpdate2.name = 'some other name';

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.id = '1fd52120-d3a9-4e7a-b23c-96c0e1a74ae5';
        delete ruleUpdate.rule_id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
          .set('kbn-xsrf', 'true')
          .send([ruleUpdate])
          .expect(200);

        expect(body).to.eql([
          {
            id: '1fd52120-d3a9-4e7a-b23c-96c0e1a74ae5',
            error: {
              status_code: 404,
              message: 'id: "1fd52120-d3a9-4e7a-b23c-96c0e1a74ae5" not found',
            },
          },
        ]);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake rule_id', async () => {
        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.rule_id = 'fake_id';
        delete ruleUpdate.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.name = 'some other name';
        delete ruleUpdate.id;

        const ruleUpdate2 = getSimpleRuleUpdate('fake_id');
        ruleUpdate2.name = 'some other name';
        delete ruleUpdate.id;

        // update one rule name and give a fake id for the second
        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update one rule name and give a fake id for the second
        const rule1 = getSimpleRuleUpdate();
        delete rule1.rule_id;
        rule1.id = createdBody.id;
        rule1.name = 'some other name';

        const rule2 = getSimpleRuleUpdate();
        delete rule2.rule_id;
        rule2.id = 'b3aa019a-656c-4311-b13b-4d9852e24347';
        rule2.name = 'some other name';

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_BULK_UPDATE)
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
              message: 'id: "b3aa019a-656c-4311-b13b-4d9852e24347" not found',
              status_code: 404,
            },
            id: 'b3aa019a-656c-4311-b13b-4d9852e24347',
          },
        ]);
      });
    });
  });
};
