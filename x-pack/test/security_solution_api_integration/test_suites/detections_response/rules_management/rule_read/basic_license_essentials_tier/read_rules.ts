/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should be able to read a single rule using rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: 'rule-1' } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should be able to read a single rule using id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule());

        const { body } = await securitySolutionApi
          .readRule({ query: { id: createRuleBody.id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should be able to read a single rule with an auto-generated rule_id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: createRuleBody.rule_id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await securitySolutionApi
          .readRule({ query: { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' } })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
        });
      });

      it('should return 404 if given a fake rule_id', async () => {
        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: 'fake_id' } })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });
    });
  });
};
