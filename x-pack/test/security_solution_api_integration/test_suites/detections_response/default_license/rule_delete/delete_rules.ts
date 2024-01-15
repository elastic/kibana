/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../utils';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless delete_rules', () => {
    describe('deleting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should delete a single rule with a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // delete the rule by its rule_id
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated rule_id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        // delete that rule by its auto-generated rule_id
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=${bodyWithCreatedRule.rule_id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its auto-generated id
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?id=${bodyWithCreatedRule.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return an error if the id does not exist when trying to delete it', async () => {
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(404);

        expect(body).to.eql({
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
          status_code: 404,
        });
      });

      it('should return an error if the rule_id does not exist when trying to delete it', async () => {
        const { body } = await supertest
          .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=fake_id`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .expect(404);

        expect(body).to.eql({
          message: 'rule_id: "fake_id" not found',
          status_code: 404,
        });
      });
    });
  });
};
