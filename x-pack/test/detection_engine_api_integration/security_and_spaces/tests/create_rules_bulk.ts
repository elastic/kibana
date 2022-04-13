/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_BULK_CREATE } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  waitForRuleSuccessOrStatus,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('create_rules_bulk', () => {
    describe('deprecations', () => {
      afterEach(async () => {
        await deleteAllAlerts(supertest, log);
      });

      it('should return a warning header', async () => {
        const { header } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_create API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

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
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput());
      });

      /*
       This test is to ensure no future regressions introduced by the following scenario
       a call to updateApiKey was invalidating the api key used by the
       rule while the rule was executing, or even before it executed,
       on the first rule run.
       this pr https://github.com/elastic/kibana/pull/68184
       fixed this by finding the true source of a bug that required the manual
       api key update, and removed the call to that function.

       When the api key is updated before / while the rule is executing, the alert
       executor no longer has access to a service to update the rule status
       saved object in Elasticsearch. Because of this, we cannot set the rule into
       a 'failure' state, so the user ends up seeing 'running' as that is the
       last status set for the rule before it erupts in an error that cannot be
       recorded inside of the executor.

       This adds an e2e test for the backend to catch that in case
       this pops up again elsewhere.
      */
      it('should create a single rule with a rule_id and validate it ran successfully', async () => {
        const simpleRule = getRuleForSignalTesting(['auditbeat-*']);
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .send([simpleRule])
          .expect(200);

        await waitForRuleSuccessOrStatus(supertest, log, body[0].id);
      });

      it('should create a single rule without a rule_id', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRuleWithoutRuleId()])
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        expect(bodyToCompare).to.eql(getSimpleRuleOutputWithoutRuleId());
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to create the same rule_id twice', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
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
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
          .set('kbn-xsrf', 'true')
          .send([getSimpleRule()])
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_BULK_CREATE)
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
