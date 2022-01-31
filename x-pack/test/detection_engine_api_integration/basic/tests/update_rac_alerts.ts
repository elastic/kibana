/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../plugins/security_solution/common/constants';
import { RAC_ALERTS_BULK_UPDATE_URL } from '../../../../plugins/timelines/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  getQuerySignalIds,
  deleteAllAlerts,
  createRule,
  waitForSignalsToBePresent,
  getSignalsByIds,
  waitForRuleSuccessOrStatus,
  getRuleForSignalTesting,
} from '../../utils';
import { DetectionAlert } from '../../../../plugins/security_solution/common/detection_engine/schemas/alerts';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('open_close_signals', () => {
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
          .post(RAC_ALERTS_BULK_UPDATE_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: signalIds, status: 'closed', index: '.siem-signals-default' })
          .expect(200);

        const { body: signalsClosed }: { body: estypes.SearchResponse<DetectionAlert> } =
          await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds(signalIds))
            .expect(200);
        expect(signalsClosed.hits.hits.length).to.equal(10);
      });

      it('should be able close 10 signals immediately and they all should be closed', async () => {
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
          .post(RAC_ALERTS_BULK_UPDATE_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: signalIds, status: 'closed', index: '.siem-signals-default' })
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

      it('should be able mark 10 signals as acknowledged immediately and they all should be acknowledged', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        const signalIds = signalsOpen.hits.hits.map((signal) => signal._id);

        // set all of the signals to the state of acknowledged. There is no reason to use a waitUntil here
        // as this route intentionally has a waitFor within it and should only return when the query has
        // the data.
        await supertest
          .post(RAC_ALERTS_BULK_UPDATE_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: signalIds, status: 'acknowledged', index: '.siem-signals-default' })
          .expect(200);

        const { body: acknowledgedSignals }: { body: estypes.SearchResponse<DetectionAlert> } =
          await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds(signalIds))
            .expect(200);

        const everyAcknowledgedSignal = acknowledgedSignals.hits.hits.every(
          (hit) => hit._source?.['kibana.alert.workflow_status'] === 'acknowledged'
        );
        expect(everyAcknowledgedSignal).to.eql(true);
      });
    });
  });
};
