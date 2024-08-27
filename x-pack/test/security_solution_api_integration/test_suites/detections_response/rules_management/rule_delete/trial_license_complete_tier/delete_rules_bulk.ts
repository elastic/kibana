/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { DETECTION_ENGINE_RULES_BULK_DELETE } from '@kbn/security-solution-plugin/common/constants';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  updateUsername,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
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
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  // See https://github.com/elastic/kibana/issues/130963 for discussion on deprecation
  describe('@ess @skipInServerlesMKI delete_rules_bulk', () => {
    describe('deprecations', () => {
      it('should return a warning header', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { header } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ rule_id: 'rule-1' }] })
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_delete API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

    describe('deleting rules bulk using DELETE', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        // delete the rule in bulk
        const { body } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ rule_id: 'rule-1' }] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its rule_id
        const { body } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ rule_id: bodyWithCreatedRule.rule_id }] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its id
        const { body } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ id: bodyWithCreatedRule.id }] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ rule_id: 'fake_id' }] })
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
        const { body } = await securitySolutionApi
          .bulkDeleteRules({ body: [{ id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }] })
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

        const { body } = await securitySolutionApi
          .bulkDeleteRules({
            body: [{ id: bodyWithCreatedRule.id }, { id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }],
          })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect([bodyToCompare, body[1]]).to.eql([
          expectedRule,
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
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        // delete the rule in bulk
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ rule_id: 'rule-1' }])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());
        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its rule_id
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .send([{ rule_id: bodyWithCreatedRule.rule_id }])
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its id
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: bodyWithCreatedRule.id }])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);

        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return an error if the ruled_id does not exist when trying to delete a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ rule_id: 'fake_id' }])
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
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
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
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([{ id: bodyWithCreatedRule.id }, { id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612' }])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );
        expect([bodyToCompare, body[1]]).to.eql([
          expectedRule,
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

    describe('legacy investigation fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;
      let ruleWithLegacyInvestigationFieldEmptyArray: Rule<BaseRuleParams>;

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await createAlertsIndex(supertest, log);
        ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFields()
        );
        ruleWithLegacyInvestigationFieldEmptyArray = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
        );
        await createRule(supertest, log, {
          ...getSimpleRule('rule-with-investigation-field'),
          name: 'Test investigation fields object',
          investigation_fields: { field_names: ['host.name'] },
        });
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('DELETE - should delete a single rule with investigation field', async () => {
        // delete the rule in bulk
        const { body } = await securitySolutionApi
          .bulkDeleteRules({
            body: [
              { rule_id: 'rule-with-investigation-field' },
              { rule_id: ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId },
              { rule_id: ruleWithLegacyInvestigationField.params.ruleId },
            ],
          })
          .expect(200);
        const investigationFields = body.map((rule: RuleResponse) => rule.investigation_fields);
        expect(investigationFields).to.eql([
          { field_names: ['host.name'] },
          undefined,
          { field_names: ['client.address', 'agent.name'] },
        ]);
      });

      it('POST - should delete a single rule with investigation field', async () => {
        // delete the rule in bulk
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_DELETE)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send([
            { rule_id: 'rule-with-investigation-field' },
            { rule_id: ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId },
            { rule_id: ruleWithLegacyInvestigationField.params.ruleId },
          ])
          .expect(200);
        const investigationFields = body.map((rule: RuleResponse) => rule.investigation_fields);
        expect(investigationFields).to.eql([
          { field_names: ['host.name'] },
          undefined,
          { field_names: ['client.address', 'agent.name'] },
        ]);
      });
    });
  });
};
