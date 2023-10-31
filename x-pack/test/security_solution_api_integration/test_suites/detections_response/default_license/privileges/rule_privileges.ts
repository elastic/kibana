/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  createDetectionEngineIndices,
  deleteAllRules,
  waitForRulePartialFailure,
  createRuleWithAuth,
  deleteAllAlerts,
  getCustomQueryRule,
  getThresholdRule,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  const INDEX_WITH_ACCESS = 'logs-test';
  const INDEX_WITH_ACCESS_PATTERN = 'logs-*';
  const INDEX_WITHOUT_ACCESS = 'unknown';
  const INDEX_WITHOUT_ACCESS_PATTERN = 'unknown';

  describe('@ess @serverless Rule privileges', () => {
    before(async () => {
      await createDetectionEngineIndices(supertest, log);
      await deleteAllAlerts(supertest, log, es);
      await es.indices.delete({ index: INDEX_WITH_ACCESS, ignore_unavailable: true });
      await es.indices.delete({ index: INDEX_WITHOUT_ACCESS, ignore_unavailable: true });
      // @timestamp mapping is required for the Threshold rule testing
      await es.indices.create({
        index: 'logs-test',
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date',
            },
          },
        },
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('should set status to partial failure when user has no access', () => {
      [
        [INDEX_WITHOUT_ACCESS],
        [INDEX_WITH_ACCESS, INDEX_WITHOUT_ACCESS],
        [INDEX_WITHOUT_ACCESS_PATTERN],
        [INDEX_WITH_ACCESS_PATTERN, INDEX_WITHOUT_ACCESS_PATTERN],
      ].forEach((indices) => {
        it(`for KQL rule with index param: ${indices}`, async () => {
          const rule = getCustomQueryRule({
            index: indices,
            query: 'process.executable: "/usr/bin/sudo"',
            from: 'now-1h',
            enabled: true,
          });
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
          expect(body?.execution_summary?.last_execution.message).to.eql(
            `This rule may not have the required read privileges to the following index patterns: ["${INDEX_WITHOUT_ACCESS}"]`
          );
        });
      });

      [
        [INDEX_WITH_ACCESS, INDEX_WITHOUT_ACCESS],
        [INDEX_WITH_ACCESS_PATTERN, INDEX_WITHOUT_ACCESS_PATTERN],
      ].forEach((indices) => {
        it(`for threshold rule with index param: ${indices}`, async () => {
          const rule = getThresholdRule({
            index: indices,
            threshold: {
              field: [],
              value: 1,
            },
            from: 'now-1h',
            enabled: true,
          });
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
          expect(body?.execution_summary?.last_execution.message).to.eql(
            `This rule may not have the required read privileges to the following index patterns: ["${INDEX_WITHOUT_ACCESS}"]`
          );
        });
      });
    });
  });
};
