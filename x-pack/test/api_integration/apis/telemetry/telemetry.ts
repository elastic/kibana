/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import type { SuperTest } from 'supertest';
import type supertestAsPromised from 'supertest-as-promised';
import deepmerge from 'deepmerge';
import type { FtrProviderContext } from '../../ftr_provider_context';

import multiClusterFixture from './fixtures/multicluster.json';
import basicClusterFixture from './fixtures/basiccluster.json';
import ossRootTelemetrySchema from '../../../../../src/plugins/telemetry/schema/oss_root.json';
import xpackRootTelemetrySchema from '../../../../plugins/telemetry_collection_xpack/schema/xpack_root.json';
import monitoringRootTelemetrySchema from '../../../../plugins/telemetry_collection_xpack/schema/xpack_monitoring.json';
import ossPluginsTelemetrySchema from '../../../../../src/plugins/telemetry/schema/oss_plugins.json';
import xpackPluginsTelemetrySchema from '../../../../plugins/telemetry_collection_xpack/schema/xpack_plugins.json';
import { assertTelemetryPayload } from '../../../../../test/api_integration/apis/telemetry/utils';

/**
 * Update the .monitoring-* documents loaded via the archiver to the recent `timestamp`
 * @param esSupertest The client to send requests to ES
 * @param fromTimestamp The lower timestamp limit to query the documents from
 * @param toTimestamp The upper timestamp limit to query the documents from
 * @param timestamp The new timestamp to be set
 */
function updateMonitoringDates(
  esSupertest: SuperTest<supertestAsPromised.Test>,
  fromTimestamp: string,
  toTimestamp: string,
  timestamp: string
) {
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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');

  describe('/api/telemetry/v2/clusters/_stats', () => {
    const timestamp = new Date().toISOString();
    describe('monitoring/multicluster', () => {
      let localXPack: Record<string, unknown>;
      let monitoring: Array<Record<string, unknown>>;

      const archive = 'monitoring/multicluster';
      const fromTimestamp = '2017-08-15T21:00:00.000Z';
      const toTimestamp = '2017-08-16T00:00:00.000Z';

      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);

        const { body } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ unencrypted: true })
          .expect(200);

        expect(body.length).to.be.greaterThan(1);
        localXPack = body.shift();
        monitoring = body;
      });
      after(() => esArchiver.unload(archive));

      it('should pass the schema validations', () => {
        const root = deepmerge(ossRootTelemetrySchema, xpackRootTelemetrySchema);

        // Merging root to monitoring because `kibana` may be passed in some cases for old collection methods reporting to a newer monitoring cluster
        const monitoringRoot = deepmerge(
          root,
          // It's nested because of the way it's collected and declared
          monitoringRootTelemetrySchema.properties.monitoringTelemetry.properties.stats.items
        );
        const plugins = deepmerge(ossPluginsTelemetrySchema, xpackPluginsTelemetrySchema);
        try {
          assertTelemetryPayload({ root, plugins }, localXPack);
          monitoring.forEach((stats) => {
            assertTelemetryPayload({ root: monitoringRoot, plugins }, stats);
          });
        } catch (err) {
          err.message = `The telemetry schemas in 'x-pack/plugins/telemetry_collection_xpack/schema/' are out-of-date, please update it as required: ${err.message}`;
          throw err;
        }
      });

      it('should load multiple trial-license clusters', async () => {
        expect(monitoring).length(3);
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
          .send({ unencrypted: true })
          .expect(200);

        expect(body).length(2);
        const [localXPack, ...monitoring] = body;
        expect(localXPack.collectionSource).to.eql('local_xpack');
        expect(monitoring).to.eql(basicClusterFixture.map((item) => ({ ...item, timestamp })));
      });
    });
  });
}
