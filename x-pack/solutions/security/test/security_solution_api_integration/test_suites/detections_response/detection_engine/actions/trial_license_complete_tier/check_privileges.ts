/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import type { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';

import {
  deleteAllRules,
  deleteAllAlerts,
  createAlertsIndex,
  waitForRulePartialFailure,
  getRuleForAlertTesting,
} from '@kbn/detections-response-ftr-services';
import { createRuleWithAuth, getThresholdRuleForAlertTesting } from '../../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless @skipInServerless check_privileges', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alias'
      );
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alias'
      );
      await deleteAllAlerts(supertest, log, es);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
    });

    context('when all indices exist but user cannot read host_alias', () => {
      const indexTestCases = [
        ['host_alias'],
        ['host_alias', 'auditbeat-8.0.0'],
        ['host_alias*'],
        ['host_alias*', 'auditbeat-*'],
      ];

      indexTestCases.forEach((index) => {
        it(`sets rule status to partial failure for KQL rule with index param: ${index}`, async () => {
          const rule = {
            ...getRuleForAlertTesting(index),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          await createUserAndRole(getService, ROLES.detections_admin);
          const { id } = await createRuleWithAuth(supertestWithoutAuth, rule, {
            user: ROLES.detections_admin,
            pass: 'changeme',
          });
          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(body?.execution_summary?.last_execution.message).to.contain(
            `This rule's API key is unable to access all indices that match the ["${index[0]}"] pattern. To learn how to update and manage API keys, refer to https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts/alerting-setup#alerting-authorization`
          );

          await deleteUserAndRole(getService, ROLES.detections_admin);
        });
      });
    });

    context('when some specified indices do not exist, but user can read all others', () => {});

    describe('when no specified indices exist', () => {
      describe('for a query rule', () => {
        it('sets rule status to partial failure and does not execute', async () => {
          const rule = getRuleForAlertTesting(['non-existent-index']);
          await createUserAndRole(getService, ROLES.detections_admin);
          const { id } = await createRuleWithAuth(supertestWithoutAuth, rule, {
            user: ROLES.detections_admin,
            pass: 'changeme',
          });

          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          const lastExecution = body?.execution_summary?.last_execution;

          expect(lastExecution.message).to.contain(
            'This rule is attempting to query data from Elasticsearch indices listed in the "Index patterns" section of the rule definition, however no index matching: ["non-existent-index"] was found. This warning will continue to appear until a matching index is created or this rule is disabled.'
          );

          // no metrics == no work performed, presumably
          expect(lastExecution.metrics).to.eql({});

          await deleteUserAndRole(getService, ROLES.detections_admin);
        });
      });
    });

    context('for threshold rules', () => {
      const thresholdIndexTestCases = [
        ['host_alias', 'auditbeat-8.0.0'],
        ['host_alias*', 'auditbeat-*'],
      ];

      thresholdIndexTestCases.forEach((index) => {
        it(`with index param: ${index}`, async () => {
          const rule: ThresholdRuleCreateProps = {
            ...getThresholdRuleForAlertTesting(index),
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
          await waitForRulePartialFailure({
            supertest,
            log,
            id,
          });
          const { body } = await supertest
            .get(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .query({ id })
            .expect(200);

          // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
          expect(body?.execution_summary?.last_execution.message).to.contain(
            `This rule's API key is unable to access all indices that match the ["${index[0]}"] pattern. To learn how to update and manage API keys, refer to https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts/alerting-setup#alerting-authorization`
          );

          await deleteUserAndRole(getService, ROLES.detections_admin);
        });
      });
    });
  });
};
