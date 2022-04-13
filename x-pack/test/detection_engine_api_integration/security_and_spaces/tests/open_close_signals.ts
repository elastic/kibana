/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
  waitForRuleSuccessOrStatus,
  getRuleForSignalTesting,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { DetectionAlert } from '../../../../plugins/security_solution/common/detection_engine/schemas/alerts';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

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
        await createSignalsIndex(supertest, log);
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send(setSignalStatus({ signalIds: ['123'], status: 'open' }))
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql(getSignalStatusEmptyResponse());

        await deleteSignalsIndex(supertest, log);
      });

      describe('tests with auditbeat data', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        beforeEach(async () => {
          await deleteAllAlerts(supertest, log);
          await createSignalsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest, log);
          await deleteAllAlerts(supertest, log);
        });

        it('should be able to execute and get 10 signals', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 10, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).equal(10);
        });

        it('should be have set the signals in an open state initially', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 10, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const everySignalOpen = signalsOpen.hits.hits.every(
            (hit) => hit._source?.[ALERT_WORKFLOW_STATUS] === 'open'
          );
          expect(everySignalOpen).to.eql(true);
        });

        it('should be able to get a count of 10 closed signals when closing 10', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 10, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // set all of the signals to the state of closed. There is no reason to use a waitUntil here
          // as this route intentionally has a waitFor within it and should only return when the query has
          // the data.
          await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setSignalStatus({ signalIds, status: 'closed' }))
            .expect(200);

          const { body: signalsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQuerySignalIds(signalIds))
              .expect(200);
          expect(signalsClosed.hits.hits.length).to.equal(10);
        });

        it('should be able close signals immediately and they all should be closed', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // set all of the signals to the state of closed. There is no reason to use a waitUntil here
          // as this route intentionally has a waitFor within it and should only return when the query has
          // the data.
          await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setSignalStatus({ signalIds, status: 'closed' }))
            .expect(200);

          const { body: signalsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQuerySignalIds(signalIds))
              .expect(200);

          const everySignalClosed = signalsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'closed'
          );
          expect(everySignalClosed).to.eql(true);
        });

        // This fails and should be investigated or removed if it no longer applies
        it.skip('should be able to close signals with t1 analyst user', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          await createUserAndRole(getService, ROLES.t1_analyst);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // Try to set all of the signals to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(ROLES.t1_analyst, 'changeme')
            .send(setSignalStatus({ signalIds, status: 'closed' }))
            .expect(200);

          // query for the signals with the superuser
          // to allow a check that the signals were NOT closed with t1 analyst
          const { body: signalsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQuerySignalIds(signalIds))
              .expect(200);

          const everySignalClosed = signalsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'closed'
          );
          expect(everySignalClosed).to.eql(true);

          await deleteUserAndRole(getService, ROLES.t1_analyst);
        });

        // This fails and should be investigated or removed if it no longer applies
        it.skip('should be able to close signals with soc_manager user', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const userAndRole = ROLES.soc_manager;
          await createUserAndRole(getService, userAndRole);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

          // Try to set all of the signals to the state of closed.
          // This should not be possible with the given user.
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .auth(userAndRole, 'changeme') // each user has the same password
            .send(setSignalStatus({ signalIds, status: 'closed' }))
            .expect(200);

          const { body: signalsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
            await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQuerySignalIds(signalIds))
              .expect(200);

          const everySignalClosed = signalsClosed.hits.hits.every(
            (hit) => hit._source?.['kibana.alert.workflow_status'] === 'closed'
          );
          expect(everySignalClosed).to.eql(true);

          await deleteUserAndRole(getService, userAndRole);
        });
      });
    });
  });
};
