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
import { createUserAndRole } from '../roles_users_utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');

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

        it('should be able close signals immediately and they all should be closed', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
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

        it('should NOT be able to close signals with t1 analyst user', async () => {
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };
          await createRule(supertest, rule);
          await waitForSignalsToBePresent(supertest);
          await createUserAndRole(securityService, ROLES.t1_analyst);
          const signalsOpen = await getAllSignals(supertest);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // Try to set all of the signals to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(ROLES.t1_analyst, 'changeme')
            .send(setSignalStatus({ signalIds, status: 'closed' }))
            .expect(403);

          // query for the signals with the superuser
          // to allow a check that the signals were NOT closed with t1 analyst
          const {
            body: signalsClosed,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds(signalIds))
            .expect(200);

          const everySignalOpen = signalsClosed.hits.hits.every(
            ({
              _source: {
                signal: { status },
              },
            }) => status === 'open'
          );
          expect(everySignalOpen).to.eql(true);
        });

        it('should be able to close signals with soc_manager user', async () => {
          const rule = { ...getSimpleRule(), from: '1900-01-01T00:00:00.000Z', query: '*:*' };
          await createRule(supertest, rule);
          await waitForSignalsToBePresent(supertest);
          const userAndRole = ROLES.soc_manager;
          await createUserAndRole(securityService, userAndRole);
          const signalsOpen = await getAllSignals(supertest);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // Try to set all of the signals to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(userAndRole, 'changeme') // each user has the same password
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
