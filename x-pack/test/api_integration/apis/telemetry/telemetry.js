/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import multiClusterFixture from './fixtures/multicluster';
import basicClusterFixture from './fixtures/basiccluster';

/**
 * Update the .monitoring-* documents loaded via the archiver to the recent `timestamp`
 * @param esSupertest The client to send requests to ES
 * @param fromTimestamp The lower timestamp limit to query the documents from
 * @param toTimestamp The upper timestamp limit to query the documents from
 * @param timestamp The new timestamp to be set
 */
function updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp) {
  return Promise.all([
    esSupertest
      .post('/.monitoring-es-*/_update_by_query?refresh=true')
      .send({
        query: {
          range: {
            timestamp: {
              format: 'epoch_millis',
              gte: moment(fromTimestamp).valueOf(),
              lte: moment(toTimestamp).valueOf(),
            },
          },
        },
        script: {
          source: `ctx._source.timestamp='${timestamp}'`,
          lang: 'painless',
        },
      })
      .expect(200),
    esSupertest
      .post('/.monitoring-kibana-*/_update_by_query?refresh=true')
      .send({
        query: {
          range: {
            timestamp: {
              format: 'epoch_millis',
              gte: moment(fromTimestamp).valueOf(),
              lte: moment(toTimestamp).valueOf(),
            },
          },
        },
        script: {
          source: `ctx._source.timestamp='${timestamp}'`,
          lang: 'painless',
        },
      })
      .expect(200),
  ]);
}

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');

  describe('/api/telemetry/v2/clusters/_stats', () => {
    const timestamp = new Date().toISOString();
    describe('monitoring/multicluster', () => {
      const archive = 'monitoring/multicluster';
      const fromTimestamp = '2017-08-15T21:00:00.000Z';
      const toTimestamp = '2017-08-16T00:00:00.000Z';
      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);
      });
      after(() => esArchiver.unload(archive));
      it('should load multiple trial-license clusters', async () => {
        const { body } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ timestamp, unencrypted: true })
          .expect(200);

        expect(body).length(4);
        const [localXPack, ...monitoring] = body;
        expect(localXPack.collectionSource).to.eql('local_xpack');
        expect(monitoring).to.eql(multiClusterFixture.map((item) => ({ ...item, timestamp })));
      });
    });

    describe('with basic cluster and reporting and canvas usage info', () => {
      const archive = 'monitoring/basic_6.3.x';
      const fromTimestamp = '2018-07-23T22:54:59.087Z';
      const toTimestamp = '2018-07-23T22:55:05.933Z';
      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);
      });
      after(() => esArchiver.unload(archive));
      it('should load non-expiring basic cluster', async () => {
        const { body } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ timestamp, unencrypted: true })
          .expect(200);

        expect(body).length(2);
        const [localXPack, ...monitoring] = body;
        expect(localXPack.collectionSource).to.eql('local_xpack');
        expect(monitoring).to.eql(basicClusterFixture.map((item) => ({ ...item, timestamp })));
      });
    });
  });
}
