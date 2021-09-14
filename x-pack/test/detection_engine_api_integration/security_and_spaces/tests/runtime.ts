/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  interface Runtime {
    name: string;
    hostname: string;
  }

  describe('Tests involving runtime fields of source indexes and the signals index', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/runtime');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/runtime');
    });

    describe('Regular runtime field mappings', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });

      it('should copy normal non-runtime data set from the source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((signal) => (signal._source?.host as Runtime).name);
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });

      it('should copy "runtime mapping" data from a source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map(
          (signal) => (signal._source?.host as Runtime).hostname
        );
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });
    });

    describe('Runtime field mappings that have conflicts within them', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      /**
       * Note, this test shows that we do not shadow or overwrite runtime fields on-top of regular fields as we reduced
       * risk with overwriting fields in the strategy we are currently using in detection engine. If you swap, change the strategies
       * because we decide to overwrite "_source" values with "fields", then expect to change this test.
       */
      it('should NOT copy normal non-runtime data set from the source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((signal) => signal._source?.host);
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
      it('should NOT copy "runtime mapping" data from a source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map(
          (signal) => (signal._source?.host as Runtime).hostname
        );
        expect(hits).to.eql([undefined, undefined, undefined, undefined]);
      });
    });
  });
};
