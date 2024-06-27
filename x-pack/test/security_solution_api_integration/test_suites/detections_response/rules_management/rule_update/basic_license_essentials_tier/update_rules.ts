/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getSimpleRuleOutput,
  getCustomQueryRuleParams,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleUpdate,
  getSimpleMlRuleUpdate,
  getSimpleRule,
  updateUsername,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  createRule,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless update_rules', () => {
    describe('update rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should update a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should update a rule with defaultable fields', async () => {
        const ruleUpdateProperties = getCustomQueryRuleParams({
          rule_id: 'rule-1',
          max_signals: 200,
          setup: '# some setup markdown',
          related_integrations: [
            { package: 'package-a', version: '^1.2.3' },
            { package: 'package-b', integration: 'integration-b', version: '~1.1.1' },
          ],
          required_fields: [{ name: '@timestamp', type: 'date' }],
        });

        const expectedRule = {
          ...ruleUpdateProperties,
          required_fields: [{ name: '@timestamp', type: 'date', ecs: true }],
        };

        await securitySolutionApi.createRule({
          body: getCustomQueryRuleParams({ rule_id: 'rule-1' }),
        });

        const { body: updatedRuleResponse } = await securitySolutionApi
          .updateRule({
            body: ruleUpdateProperties,
          })
          .expect(200);

        expect(updatedRuleResponse).toMatchObject(expectedRule);

        const { body: updatedRule } = await securitySolutionApi
          .readRule({
            query: { rule_id: 'rule-1' },
          })
          .expect(200);

        expect(updatedRule).toMatchObject(expectedRule);
      });

      it('@skipInServerless should return a 403 forbidden if it is a machine learning job', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's type to try to be a machine learning job type
        const updatedRule = getSimpleMlRuleUpdate('rule-1');
        updatedRule.rule_id = 'rule-1';
        updatedRule.name = 'some other name';
        delete updatedRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(403);

        expect(body).toEqual({
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

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should update a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.name = 'some other name';
        updatedRule.id = createdBody.id;
        delete updatedRule.rule_id;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should change the revision of a rule when it updates enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // update a simple rule's enabled to false and another property
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.severity = 'low';
        updatedRule.enabled = false;

        const { body } = await securitySolutionApi.updateRule({ body: updatedRule }).expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should change other properties when it does updates and effectively delete them such as timeline_title', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const ruleUpdate = getSimpleRuleUpdate('rule-1');
        ruleUpdate.timeline_title = 'some title';
        ruleUpdate.timeline_id = 'some id';

        // update a simple rule's timeline_title
        await securitySolutionApi.updateRule({ body: ruleUpdate }).expect(200);

        const ruleUpdate2 = getSimpleRuleUpdate('rule-1');
        ruleUpdate2.name = 'some other name';

        // update a simple rule's name
        const { body } = await securitySolutionApi.updateRule({ body: ruleUpdate2 }).expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 2;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.id = '5096dec6-b6b9-4d8d-8f93-6c2602079d9d';
        delete simpleRule.rule_id;

        const { body } = await securitySolutionApi.updateRule({ body: simpleRule }).expect(404);

        expect(body).toEqual({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const simpleRule = getSimpleRuleUpdate();
        simpleRule.rule_id = 'fake_id';
        delete simpleRule.id;

        const { body } = await securitySolutionApi.updateRule({ body: simpleRule }).expect(404);

        expect(body).toEqual({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });

      describe('max signals', () => {
        afterEach(async () => {
          await deleteAllRules(supertest, log);
        });

        it('should reset max_signals field to default value on update when not present', async () => {
          const expectedRule = getCustomQueryRuleParams({
            rule_id: 'rule-1',
            max_signals: 100,
          });

          await securitySolutionApi.createRule({
            body: getCustomQueryRuleParams({ rule_id: 'rule-1', max_signals: 200 }),
          });

          const { body: updatedRuleResponse } = await securitySolutionApi
            .updateRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-1',
                max_signals: undefined,
              }),
            })
            .expect(200);

          expect(updatedRuleResponse).toMatchObject(expectedRule);
        });

        it('does NOT update a rule when max_signals is less than 1', async () => {
          await securitySolutionApi.createRule({
            body: getCustomQueryRuleParams({ rule_id: 'rule-1', max_signals: 100 }),
          });

          const { body } = await securitySolutionApi
            .updateRule({
              body: getCustomQueryRuleParams({
                rule_id: 'rule-1',
                max_signals: 0,
              }),
            })
            .expect(400);

          expect(body.message).toEqual(
            '[request body]: max_signals: Number must be greater than or equal to 1'
          );
        });
      });

      describe('required_fields', () => {
        it('should reset required fields field to default value on update when not present', async () => {
          const expectedRule = getCustomQueryRuleParams({
            rule_id: 'required-fields-default-value-test',
            required_fields: [],
          });

          await securitySolutionApi.createRule({
            body: getCustomQueryRuleParams({
              rule_id: 'required-fields-default-value-test',
              required_fields: [{ name: 'host.name', type: 'keyword' }],
            }),
          });

          const { body: updatedRuleResponse } = await securitySolutionApi
            .updateRule({
              body: getCustomQueryRuleParams({
                rule_id: 'required-fields-default-value-test',
                required_fields: undefined,
              }),
            })
            .expect(200);

          expect(updatedRuleResponse).toMatchObject(expectedRule);
        });
      });
    });
  });
};
