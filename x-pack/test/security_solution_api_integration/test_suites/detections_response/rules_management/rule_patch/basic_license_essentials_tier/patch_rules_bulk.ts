/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getCustomQueryRuleParams,
  removeServerGeneratedProperties,
  getSimpleRuleOutputWithoutRuleId,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  installPrebuiltRules,
  createRuleAssetSavedObject,
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

  // TODO: https://github.com/elastic/kibana/issues/193184 Delete this file and clean up the code
  describe.skip('@ess @serverless @skipInServerlessMKI patch_rules_bulk', () => {
    describe('patch rules bulk', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should patch a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', name: 'some other name' }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        const expectedRule = updateUsername(outputRule, await utils.getUsername());
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

        const { body: patchedRulesBulkResponse } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                ...rulePatchProperties,
              },
            ],
          })
          .expect(200);

        expect(patchedRulesBulkResponse[0]).toMatchObject(expectedRule);

        const { body: patchedRule } = await securitySolutionApi
          .readRule({
            query: { rule_id: 'rule-1' },
          })
          .expect(200);

        expect(patchedRule).toMatchObject(expectedRule);
      });

      it('should patch two rule properties of name using the two rules rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        await createRule(supertest, log, getSimpleRule('rule-2'));
        const username = await utils.getUsername();

        // patch both rule names
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: 'rule-1', name: 'some other name' },
              { rule_id: 'rule-2', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule1 = getSimpleRuleOutput();
        outputRule1.name = 'some other name';
        outputRule1.revision = 1;
        const expectedRule1 = updateUsername(outputRule1, username);

        const outputRule2 = getSimpleRuleOutput('rule-2');
        outputRule2.name = 'some other name';
        outputRule2.revision = 1;
        const expectedRule2 = updateUsername(outputRule2, username);

        const bodyToCompare1 = removeServerGeneratedProperties(body[0]);
        const bodyToCompare2 = removeServerGeneratedProperties(body[1]);
        expect(bodyToCompare1).toEqual(expectedRule1);
        expect(bodyToCompare2).toEqual(expectedRule2);
      });

      it('should patch a single rule property of name using an id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ id: createRuleBody.id, name: 'some other name' }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should patch two rule properties of name using the two rules id', async () => {
        const createRule1 = await createRule(supertest, log, getSimpleRule('rule-1'));
        const createRule2 = await createRule(supertest, log, getSimpleRule('rule-2'));
        const username = await utils.getUsername();

        // patch both rule names
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { id: createRule1.id, name: 'some other name' },
              { id: createRule2.id, name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule1 = getSimpleRuleOutputWithoutRuleId('rule-1');
        outputRule1.name = 'some other name';
        outputRule1.revision = 1;
        const expectedRule = updateUsername(outputRule1, username);

        const outputRule2 = getSimpleRuleOutputWithoutRuleId('rule-2');
        outputRule2.name = 'some other name';
        outputRule2.revision = 1;
        const expectedRule2 = updateUsername(outputRule2, username);

        const bodyToCompare1 = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const bodyToCompare2 = removeServerGeneratedPropertiesIncludingRuleId(body[1]);
        expect(bodyToCompare1).toEqual(expectedRule);
        expect(bodyToCompare2).toEqual(expectedRule2);
      });

      it('should patch a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ id: createdBody.id, name: 'some other name' }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should not change the revision of a rule when it patches only enabled', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', enabled: false }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should change the revision of a rule when it patches enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false and another property
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', severity: 'low', enabled: false }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should not change other properties when it does patches', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's timeline_title
        await securitySolutionApi
          .bulkPatchRules({
            body: [{ rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' }],
          })
          .expect(200);

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', name: 'some other name' }] })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.timeline_title = 'some title';
        outputRule.timeline_id = 'some id';
        outputRule.revision = 2;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake id', async () => {
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [{ id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' }],
          })
          .expect(200);

        expect(body).toEqual([
          {
            id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d',
            error: {
              status_code: 404,
              message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
            },
          },
        ]);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake rule_id', async () => {
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'fake_id', name: 'some other name' }] })
          .expect(200);

        expect(body).toEqual([
          {
            rule_id: 'fake_id',
            error: { status_code: 404, message: 'rule_id: "fake_id" not found' },
          },
        ]);
      });

      it('should patch one rule property and give an error about a second fake rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch one rule name and give a fake id for the second
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: 'rule-1', name: 'some other name' },
              { rule_id: 'fake_id', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).toEqual([
          expectedRule,
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should patch one rule property and give an error about a second fake id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch one rule name and give a fake id for the second
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { id: createdBody.id, name: 'some other name' },
              { id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule = getSimpleRuleOutput();
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const expectedRule = updateUsername(outputRule, await utils.getUsername());

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).toEqual([
          expectedRule,
          {
            error: {
              message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
              status_code: 404,
            },
            id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d',
          },
        ]);
      });

      // Unskip: https://github.com/elastic/kibana/issues/195921
      it('@skipInServerlessMKI throws an error if rule has external rule source and non-customizable fields are changed', async () => {
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', author: ['elastic'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', license: 'basic' }),
        ]);
        await installPrebuiltRules(es, supertest);

        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: 'rule-1', author: ['new user'] },
              { rule_id: 'rule-2', license: 'new license' },
            ],
          })
          .expect(200);

        expect([body[0], body[1]]).toEqual([
          {
            error: {
              message: 'Cannot update "author" field for prebuilt rules',
              status_code: 400,
            },
            rule_id: 'rule-1',
          },
          {
            error: {
              message: 'Cannot update "license" field for prebuilt rules',
              status_code: 400,
            },
            rule_id: 'rule-2',
          },
        ]);
      });
    });
  });
};
