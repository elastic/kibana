/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { deleteAllRules, getSimpleRule, createRule } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess patch_rules_basic_license', () => {
    describe('patch rules', () => {
      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should return a "403 forbidden" using a rule_id of type "machine learning"', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's type to machine learning
        const { body } = await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: 'rule-1', type: 'machine_learning' })
          .expect(403);

        expect(body).to.eql({
          message: 'Your license does not support machine learning. Please upgrade your license.',
          status_code: 403,
        });
      });
    });
  });
};
