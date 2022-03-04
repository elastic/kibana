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
export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('create_rules_bulk', () => {
    describe('creating rules in bulk', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
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
