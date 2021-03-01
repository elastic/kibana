/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { createJobConfig } from 'x-pack/test/api_integration/apis/ml/annotations/common_jobs';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  removeServerGeneratedProperties,
  getSimpleMlRule,
  getSimpleMlRuleOutput,
  waitForRuleSuccessOrStatus,
  createRule,
} from '../../utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../roles_users_utils';

const JOB_ID = 'test_detections_ml';
const testJobConfig = createJobConfig(JOB_ID);

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('create_machine_learning_rule', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before creating a rule', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleMlRule())
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });

    describe('creating machine learning rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await ml.testResources.setKibanaTimeZoneToUTC();
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });

      describe('elastic admin', () => {
        it('should create a single rule with a rule_id', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).to.eql(getSimpleMlRuleOutput());
        });

        it('should create a single rule with a rule_id and have failure status if job does not exist', async () => {
          const ruleResponse = await createRule(
            supertest,
            getSimpleMlRule('rule-1', true, 'fake_id')
          );

          await waitForRuleSuccessOrStatus(supertest, ruleResponse.id, 'failed');

          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [ruleResponse.id] })
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          expect(bodyToCompare).to.eql({
            ...getSimpleMlRuleOutput(),
            machine_learning_job_id: 'fake_id',
            enabled: true,
          });
          expect(statusBody[ruleResponse.id].current_status.last_failure_message).to.eql(
            `An error occurred during rule execution: message: "some_job_id missing" name: "Simple ML Rule" id: "${ruleResponse.id}" rule id: "rule-1" signals index: ".siem-signals-default"`
          );
        });

        it('should create a single rule with a rule_id and have failure status if job exists but not yet started', async () => {
          const ruleResponse = await createRule(supertest, getSimpleMlRule('rule-1', true));

          await waitForRuleSuccessOrStatus(supertest, ruleResponse.id, 'failed');

          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [ruleResponse.id] })
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          expect(bodyToCompare).to.eql({ ...getSimpleMlRuleOutput(), enabled: true });
          expect(statusBody[ruleResponse.id].current_status.last_failure_message).to.eql(
            `'Machine learning job is not started: job id: "some_job_id" job status: "closed" datafeed status: "" name: "Simple ML Rule" id: "${ruleResponse.id}" rule id: "rule-1" signals index: ".siem-signals-default"',`
          );
        });

        it('should cause a 409 conflict if we attempt to create the same rule_id twice', async () => {
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(200);

          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(409);

          expect(body).to.eql({
            message: 'rule_id: "rule-1" already exists',
            status_code: 409,
          });
        });
      });

      describe('t1_analyst', () => {
        const role = ROLES.t1_analyst;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should NOT be able to create a rule', async () => {
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_RULES_URL)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getSimpleMlRule())
            .expect(403);
        });
      });
    });
  });
};
