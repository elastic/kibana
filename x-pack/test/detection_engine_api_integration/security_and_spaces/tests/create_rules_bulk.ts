/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('create_rules_bulk', () => {
    describe('validation errors', () => {
      it('should give a 200 even if the index does not exist as all bulks return a 200 but have an error of 409 bad request in the body', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message:
                'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
              status_code: 400,
            },
            rule_id: 'rule-1',
          },
        ]);
      });
    });

    describe('creating rules in bulk', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should create a single rule with a rule_id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRuleWithoutRuleId()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id twice', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule(), getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id that already exists', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_create`)
          .set('kbn-xsrf', 'foo')
          .send([getSimpleRule()])
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'rule_id: "rule-1" already exists',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });
    });
  });
};
