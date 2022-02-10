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
  deleteSignalsIndex,
  deleteAllAlerts,
  waitForRuleSuccessOrStatus,
  getRuleForSignalTesting,
  createRuleWithAuth,
  getThresholdRuleForSignalTesting,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { RuleExecutionStatus } from '../../../../plugins/security_solution/common/detection_engine/schemas/common';
import { ThresholdCreateSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('check_privileges', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alias');
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alias');
      await deleteSignalsIndex(supertest, log);
    });

    beforeEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    describe('should set status to partial failure when user has no access', () => {
      const indexTestCases = [
        ['host_alias'],
        ['host_alias', 'auditbeat-8.0.0'],
        ['host_alias*'],
        ['host_alias*', 'auditbeat-*'],
      ];
      indexTestCases.forEach((index) => {
        it(`for KQL rule with index param: ${index}`, async () => {
          const rule = getRuleForSignalTesting(index);
          await createUserAndRole(getService, ROLES.detections_admin);
          const { id } = await createRuleWithAuth(supertestWithoutAuth, rule, {
            user: ROLES.detections_admin,
            pass: 'changeme',
          });
          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(body?.execution_summary?.last_execution.message).to.eql(
            `This rule may not have the required read privileges to the following indices/index patterns: ["${index[0]}"]`
          );

          await deleteUserAndRole(getService, ROLES.detections_admin);
        });

        it(`for threshold rule with index param: ${index}`, async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(index),
            threshold: {
              field: [],
              value: 700,
            },
          };
          await createUserAndRole(getService, ROLES.detections_admin);
          const { id } = await createRuleWithAuth(supertestWithoutAuth, rule, {
            user: ROLES.detections_admin,
            pass: 'changeme',
          });
          await waitForRuleSuccessOrStatus(
            supertest,
            log,
            id,
            RuleExecutionStatus['partial failure']
          );
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(body?.execution_summary?.last_execution.message).to.eql(
            `This rule may not have the required read privileges to the following indices/index patterns: ["${index[0]}"]`
          );

          await deleteUserAndRole(getService, ROLES.detections_admin);
        });
      });
    });
  });
};
