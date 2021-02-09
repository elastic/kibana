/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });

      it('should be able to read a single rule using rule_id', async () => {
        await createRule(supertest, getSimpleRule());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should be able to read a single rule using id', async () => {
        const createRuleBody = await createRule(supertest, getSimpleRule());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should be able to read a single rule with an auto-generated rule_id', async () => {
        const createRuleBody = await createRule(supertest, getSimpleRuleWithoutRuleId());

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${createRuleBody.rule_id}`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
        });
      });

      it('should return 404 if given a fake rule_id', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=fake_id`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });
    });
  });
};
