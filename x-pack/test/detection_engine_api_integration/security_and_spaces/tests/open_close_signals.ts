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
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  setSignalStatus,
  getSignalStatusEmptyResponse,
  getSimpleRule,
  waitFor,
  getQueryAllSignals,
  getQuerySignalIds,
  deleteAllAlerts,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

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

      describe('tests with auditbeat data', () => {
        beforeEach(async () => {
          await deleteAllAlerts(es);
          await createSignalsIndex(supertest);
          await esArchiver.load('auditbeat/hosts');
        });
        afterEach(async () => {
          await deleteSignalsIndex(supertest);
          await deleteAllAlerts(es);
          await esArchiver.unload('auditbeat/hosts');
        });

        it('should be able to execute and get 10 signals', async () => {
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };

          // create a simple rule
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          // wait until all the rules show up and are present
          await waitFor(async () => {
            const {
              body: signalsOpen,
            }: { body: SearchResponse<{ signal: Signal }> } = await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAllSignals())
              .expect(200);
            return signalsOpen.hits.hits.length === 10;
          });

          // Get the collection of signals
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

          // expect there to be 10
          expect(signalsOpen.hits.hits.length).equal(10);
        });

        it('should be have set the signals in an open state initially', async () => {
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };

          // create a simple rule
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          // wait until all the rules show up and are present
          await waitFor(async () => {
            const {
              body: signalsOpen,
            }: { body: SearchResponse<{ signal: Signal }> } = await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAllSignals())
              .expect(200);
            return signalsOpen.hits.hits.length === 10;
          });

          // Get the collection of signals
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

          const everySignalOpen = signalsOpen.hits.hits.every(
            ({
              _source: {
                signal: { status },
              },
            }) => status === 'open'
          );

          // expect their initial state to all be open
          expect(everySignalOpen).to.eql(true);
        });

        it('should be able to get a count of 10 closed signals when closing 10', async () => {
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };

          // create a simple rule
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          // wait until all the rules show up and are present
          await waitFor(async () => {
            const {
              body: signalsOpen,
            }: { body: SearchResponse<{ signal: Signal }> } = await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAllSignals())
              .expect(200);
            return signalsOpen.hits.hits.length === 10;
          });

          // Get a collection of signals to get the id to set open/closed on them
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

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
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };

          // create a simple rule
          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          // wait until all the rules show up and are present
          await waitFor(async () => {
            const {
              body: signalsOpen,
            }: { body: SearchResponse<{ signal: Signal }> } = await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAllSignals())
              .expect(200);
            return signalsOpen.hits.hits.length === 10;
          });

          // Get a collection of signals to get the id to set open/closed on them
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

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
  });
};
