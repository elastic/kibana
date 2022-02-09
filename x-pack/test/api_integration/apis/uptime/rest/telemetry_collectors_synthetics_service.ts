/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';
import { makeChecksWithStatus, makeChecks } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const client = getService('es');
  const testDataStreamName = 'synthetics-browser-default';

  const createDataStream = async (name: string) => {
    // A data stream requires an index template before it can be created.
    await client.indices.putIndexTemplate({
      name,
      body: {
        // We need to match the names of backing indices with this template.
        index_patterns: [name + '*'],
        template: {
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
            },
          },
        },
        data_stream: {},
      },
    });

    await client.indices.createDataStream({ name });
  };

  const deleteComposableIndexTemplate = async (name: string) => {
    await client.indices.deleteIndexTemplate({ name });
  };

  const deleteDataStream = async (name: string) => {
    await client.indices.deleteDataStream({ name });
    await deleteComposableIndexTemplate(name);
  };

  describe('telemetry collectors synthetics service', () => {
    before('generating data', async () => {
      await createDataStream(testDataStreamName);

      // step document for monitor upMonitorId
      await makeChecksWithStatus(
        client,
        'upMonitorId',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
            type: 'browser',
            check_group: '123456',
          },
          synthetics: {
            type: 'step/end',
          },
          config_id: 'upMonitorId',
          summary: null,
        },
        'up',
        undefined,
        undefined,
        testDataStreamName
      );

      // step document for upMonitorId-2
      await makeChecksWithStatus(
        client,
        'upMonitorId-2',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
            type: 'browser',
            check_group: '123456',
          },
          synthetics: {
            type: 'step/end',
          },
          config_id: 'upMonitorId-2',
          summary: null,
        },
        'up',
        undefined,
        undefined,
        testDataStreamName
      );

      // step document for upMonitorId-2
      await makeChecksWithStatus(
        client,
        'upMonitorId-2',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
            type: 'browser',
            check_group: '123456',
          },
          synthetics: {
            type: 'step/end',
          },
          config_id: 'upMonitorId-2',
          summary: null,
        },
        'up',
        undefined,
        undefined,
        testDataStreamName
      );

      // summary document for upMonitorId-2
      await makeChecksWithStatus(
        client,
        'upMonitorId-2',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
            type: 'browser',
          },
          config_id: 'upMonitorId',
        },
        'up',
        undefined,
        undefined,
        testDataStreamName
      );

      await client.indices.refresh();
    });

    after('unload heartbeat index', async () => {
      await deleteDataStream(testDataStreamName);
    });

    beforeEach(async () => {
      await client.indices.refresh();
    });

    it('should receive expected results after calling monitor logging', async () => {
      // call monitor page
      const { body: result } = await supertest
        .post(API_URLS.LOG_PAGE_VIEW)
        .set('kbn-xsrf', 'true')
        .send({
          page: 'Monitor',
          autorefreshInterval: 100,
          dateStart: 'now/d',
          dateEnd: 'now/d',
          autoRefreshEnabled: true,
          refreshTelemetryHistory: true,
          refreshEsData: true,
        })
        .expect(200);

      expect(result.synthetics_service_browser_steps).to.eql([2, 1]);
      expect(result.synthetics_service_no_of_tests).to.eql(1);
      expect(result.synthetics_service_enabled).to.eql(true);
    });

    it('should receive 200 status after overview logging', async () => {
      // call overview page
      await supertest
        .post(API_URLS.LOG_PAGE_VIEW)
        .set('kbn-xsrf', 'true')
        .send({
          page: 'Overview',
          autorefreshInterval: 60,
          dateStart: 'now/d',
          dateEnd: 'now-30',
          autoRefreshEnabled: true,
        })
        .expect(200);
    });
  });
}
