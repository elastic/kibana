/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { performance } from 'perf_hooks';

import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  interface Runtime {
    name: string;
    hostname: string;
  }

  describe('@ess @serverless Tests involving runtime fields of source indexes and the alerts index', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/runtime');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/runtime');
    });

    describe('Regular runtime field mappings', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should execute a rule to completion and not timeout when there are a lot of runtime fields', async () => {
        const rule = getRuleForAlertTesting(['runtime']);
        const { id } = await createRule(supertest, log, rule);
        const start = performance.now();
        await waitForRuleSuccess({ supertest, log, id });
        const end = performance.now();
        expect(end - start).to.be.lessThan(10000);
      });

      it('should copy normal non-runtime data set from the source index into the alerts index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForAlertTesting(['runtime']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits
          .map((alert) => (alert._source?.host as Runtime).name)
          .sort();
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });

      it('should copy "runtime mapping" data from a source index into the alerts index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForAlertTesting(['runtime']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits
          .map((alert) => (alert._source?.host as Runtime).hostname)
          .sort();
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });
    });

    describe('Runtime field mappings that have conflicts within them', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      /**
       * Note, this test shows that we do not shadow or overwrite runtime fields on-top of regular fields as we reduced
       * risk with overwriting fields in the strategy we are currently using in detection engine. If you swap, change the strategies
       * because we decide to overwrite "_source" values with "fields", then expect to change this test.
       */
      it('should NOT copy normal non-runtime data set from the source index into the alerts index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForAlertTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits
          .map((alert) => alert._source?.host as Array<{ name: string }>)
          .map((host) => {
            // sort the inner array elements first
            return host.sort((a, b) => a.name.localeCompare(b.name));
          })
          .sort((aArray, bArray) => {
            // since these are all unique, using just the first element should give us stability
            return aArray[0].name.localeCompare(bArray[0].name);
          });
        expect(hits).to.eql([
          [
            {
              name: 'host name 1_1',
            },
            {
              name: 'host name 1_2',
            },
          ],
          [
            {
              name: 'host name 2_1',
            },
            {
              name: 'host name 2_2',
            },
          ],
          [
            {
              name: 'host name 3_1',
            },
            {
              name: 'host name 3_2',
            },
          ],
          [
            {
              name: 'host name 4_1',
            },
            {
              name: 'host name 4_2',
            },
          ],
        ]);
      });

      /**
       * Note, this test shows that we do NOT shadow or overwrite runtime fields on-top of regular fields when we detect those
       * fields as arrays of objects since the objects are flattened in "fields" and we detect something already there so we skip
       * this shadowed runtime data as it is ambiguous of where we would put it in the array.
       */
      it('should NOT copy "runtime mapping" data from a source index into the alerts index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForAlertTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((alert) => (alert._source?.host as Runtime).hostname);
        expect(hits).to.eql([undefined, undefined, undefined, undefined]);
      });
    });
  });
};
