/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { deleteAllRules, getSimpleMlRuleUpdate, createRule, getSimpleRule } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess update_rules_basic_license', () => {
    describe('update rules', () => {
      afterEach(async () => {
        await deleteAllRules(supertest, log);
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
          .set('elastic-api-version', '2023-10-31')
          .send(updatedRule)
          .expect(403);

        expect(body).to.eql({
          message: 'Your license does not support machine learning. Please upgrade your license.',
          status_code: 403,
        });
      });
    });
  });
};
