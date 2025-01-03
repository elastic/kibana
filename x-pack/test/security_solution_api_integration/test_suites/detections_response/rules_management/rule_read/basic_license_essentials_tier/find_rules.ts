/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  getComplexRule,
  getComplexRuleOutput,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  updateUsername,
} from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA find_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should return an empty find body correctly if no rules are loaded', async () => {
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with defaults added', async () => {
      await createRule(supertest, log, getSimpleRule());

      // query the single rule from _find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

      expect(body).to.eql({
        data: [expectedRule],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with everything for the rule added', async () => {
      // add a single rule
      await securitySolutionApi.createRule({ body: getComplexRule() }).expect(200);

      // query and expect that we get back one record in the find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getComplexRuleOutput(), await utils.getUsername());
      expect(body).to.eql({
        data: [expectedRule],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });
  });
};
