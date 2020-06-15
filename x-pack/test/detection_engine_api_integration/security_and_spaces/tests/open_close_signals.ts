/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { RulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';
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
  waitUntil,
  getSignalStatus,
  getQueryAllSignals,
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
        before(() => esArchiver.load('auditbeat/hosts'));
        after(() => esArchiver.unload('auditbeat/hosts'));

        it('should be able to query the status immediately afterwards consistency using wait_for', async () => {
          await createSignalsIndex(supertest);
          console.log('starting the test now');
          const output = await es.search({
            index: 'auditbeat-*',
          });
          console.log('---> OUTPUT IS:', JSON.stringify(output.body, null, 2));
          const rule = getSimpleRule();
          rule.index = ['auditbeat-*'];
          rule.query = '*:*';
          // create a simple rule
          const { body: bodyOnCreate }: { body: RulesSchema } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(rule)
            .expect(200);

          // wait until the rule has executed
          await waitUntil(async () => {
            const { body: findStatus } = await supertest
              .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
              .set('kbn-xsrf', 'true')
              .send({ ids: [bodyOnCreate.id] });
            return (
              findStatus[bodyOnCreate.id]?.current_status?.status != null &&
              findStatus[bodyOnCreate.id].current_status.status !== 'going to run'
            );
          });

          await new Promise((resolve) => setTimeout(resolve, 5000));
          // search through all the signals
          const { body: signals } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

          console.log(JSON.stringify(signals, null, 2));

          expect(signals).to.eql({});

          const { body: boydOnSetSignalStatus } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send(setSignalStatus({ signalIds: [bodyOnCreate.id], status: 'open' }))
            .expect(200);

          // remove any server generated items that are indeterministic
          delete boydOnSetSignalStatus.took;
          expect(boydOnSetSignalStatus).to.eql({});

          /*
          const { body } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getSignalStatus())
            .expect(200);

          await deleteSignalsIndex(supertest);
          */
        });
      });
    });
  });
};
