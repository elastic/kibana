/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getCustomQueryRuleParams,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  installPrebuiltRules,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA patch_rules', () => {
    describe('patch rules', () => {
      beforeEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should patch a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule-1', name: 'some other name' } })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should patch defaultable fields', async () => {
        const rulePatchProperties = getCustomQueryRuleParams({
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
          ...rulePatchProperties,
          required_fields: [{ name: '@timestamp', type: 'date', ecs: true }],
        };

        await securitySolutionApi.createRule({
          body: getCustomQueryRuleParams({ rule_id: 'rule-1' }),
        });

        const { body: patchedRuleResponse } = await securitySolutionApi
          .patchRule({
            body: {
              ...rulePatchProperties,
            },
          })
          .expect(200);

        expect(patchedRuleResponse).toMatchObject(expectedRule);

        const { body: patchedRule } = await securitySolutionApi
          .readRule({
            query: { rule_id: 'rule-1' },
          })
          .expect(200);

        expect(patchedRule).toMatchObject(expectedRule);
      });

      describe('@skipInServerless ', function () {
        /* Wrapped in `describe` block, because `this.tags` only works in `describe` blocks */
        this.tags('skipFIPS');
        it('should return a "403 forbidden" using a rule_id of type "machine learning"', async () => {
          await createRule(supertest, log, getSimpleRule('rule-1'));

          // patch a simple rule's type to machine learning
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule-1', type: 'machine_learning' } })
            .expect(403);

          expect(body).toEqual({
            message: 'Your license does not support machine learning. Please upgrade your license.',
            status_code: 403,
          });
        });
      });

      it('should patch a single rule property of name using the auto-generated rule_id', async () => {
        // create a simple rule
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const createRuleBody = await createRule(supertest, log, rule);

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: createRuleBody.rule_id, name: 'some other name' } })
          .expect(200);

        const outputRule = getSimpleRuleOutputWithoutRuleId();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should patch a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .patchRule({ body: { id: createdBody.id, name: 'some other name' } })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should not change the revision of a rule when it patches only enabled', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule-1', enabled: false } })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should change the revision of a rule when it patches enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false and another property
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule-1', severity: 'low', enabled: false } })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should not change other properties when it does patches', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's timeline_title
        await securitySolutionApi
          .patchRule({
            body: { rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' },
          })
          .expect(200);

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule-1', name: 'some other name' } })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.timeline_title = 'some title';
        outputRule.timeline_id = 'some id';
        outputRule.revision = 2;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should give a 404 if it is given a fake id', async () => {
        const { body } = await securitySolutionApi
          .patchRule({
            body: { id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' },
          })
          .expect(404);

        expect(body).toEqual({
          status_code: 404,
          message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
        });
      });

      it('should give a 404 if it is given a fake rule_id', async () => {
        const { body } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'fake_id', name: 'some other name' } })
          .expect(404);

        expect(body).toEqual({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });

      it('@skipInServerlessMKI throws an error if rule has external rule source and non-customizable fields are changed', async () => {
        await deleteAllPrebuiltRuleAssets(es, log);
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', author: ['elastic'] }),
        ]);
        await installPrebuiltRules(es, supertest);

        const { body } = await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule-1',
              author: ['new user'],
            },
          })
          .expect(400);

        expect(body.message).toEqual('Cannot update "author" field for prebuilt rules');
      });

      describe('max signals', () => {
        it('does NOT patch a rule when max_signals is less than 1', async () => {
          await securitySolutionApi.createRule({
            body: getCustomQueryRuleParams({ rule_id: 'rule-1', max_signals: 100 }),
          });

          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule-1',
                max_signals: 0,
              },
            })
            .expect(400);

          expect(body.message).toEqual(
            '[request body]: max_signals: Number must be greater than or equal to 1'
          );
        });
      });

      it('should not change required_fields when not present in patch body', async () => {
        await securitySolutionApi.createRule({
          body: getCustomQueryRuleParams({
            rule_id: 'rule-1',
            required_fields: [
              {
                name: 'event.action',
                type: 'keyword',
              },
            ],
          }),
        });

        // patch a simple rule's name
        const { body: patchedRule } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule-1', name: 'some other name' } })
          .expect(200);

        expect(patchedRule.required_fields).toEqual([
          {
            name: 'event.action',
            type: 'keyword',
            ecs: true,
          },
        ]);
      });
    });
  });
};
