/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { SearchResponse } from 'elasticsearch';
import { Signal } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  setSignalStatus,
  getSignalStatusEmptyResponse,
  getQuerySignalIds,
  deleteAllAlerts,
  createRule,
  waitForSignalsToBePresent,
  getSignalsByIds,
  waitForRuleSuccess,
  getRuleForSignalTesting,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('open_close_signals', () => {
    describe('validation checks', () => {
      it('should not give errors when querying and the signals index does not exist yet', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setSignalStatus({ signalIds: ['123'], status: 'open' }))
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql(getSignalStatusEmptyResponse());
      });

      it('should not give errors when querying and the signals index does exist and is empty', async () => {
        await createSignalsIndex(supertest);
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setSignalStatus({ signalIds: ['123'], status: 'open' }))
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql(getSignalStatusEmptyResponse());

        await deleteSignalsIndex(supertest);
      });
    });

    describe('tests with auditbeat data', () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest);
        await createSignalsIndex(supertest);
        await esArchiver.load('auditbeat/hosts');
      });
      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should be able to execute and get 10 signals', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).equal(10);
      });

      it('should be have set the signals in an open state initially', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        const everySignalOpen = signalsOpen.hits.hits.every(
          ({
            _source: {
              signal: { status },
            },
          }) => status === 'open'
        );
        expect(everySignalOpen).to.eql(true);
      });

      it('should be able to get a count of 10 closed signals when closing 10', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

        // set all of the signals to the state of closed. There is no reason to use a waitUntil here
        // as this route intentionally has a waitFor within it and should only return when the query has
        // the data.
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setSignalStatus({ signalIds, status: 'closed' }))
          .expect(200);

        const {
          body: signalsClosed,
        }: { body: SearchResponse<{ signal: Signal }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(signalIds))
          .expect(200);
        expect(signalsClosed.hits.hits.length).to.equal(10);
      });

      it('should be able close 10 signals immediately and they all should be closed', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

        // set all of the signals to the state of closed. There is no reason to use a waitUntil here
        // as this route intentionally has a waitFor within it and should only return when the query has
        // the data.
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setSignalStatus({ signalIds, status: 'closed' }))
          .expect(200);

        const {
          body: signalsClosed,
        }: { body: SearchResponse<{ signal: Signal }> } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(signalIds))
          .expect(200);

        const everySignalClosed = signalsClosed.hits.hits.every(
          ({
            _source: {
              signal: { status },
            },
          }) => status === 'closed'
        );
        expect(everySignalClosed).to.eql(true);
      });
    });
  });
};
