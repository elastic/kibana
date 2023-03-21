/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import expect from '@kbn/expect';

import { getLifecycleMethods } from '../data_stream';

import emptyResponse from './fixtures/response_empty.json';
import { esBeatsResponse } from './fixtures/response_es_beats';
import { esPackageResponse } from './fixtures/response_es_package';

const ELASTICSEARCH_PACKAGE_ARCHIVE =
  'x-pack/test/api_integration/apis/monitoring/es_archives/_health/elasticsearch_package_error';
const METRICBEAT_ARCHIVE =
  'x-pack/test/api_integration/apis/monitoring/es_archives/_health/metricbeat_8';
export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('_health endpoint', () => {
    const timeRange = {
      min: '2022-05-23T22:00:00.000Z',
      max: '2022-05-23T22:30:00.000Z',
    };

    describe('no data', () => {
      it('returns an empty state when no data', async () => {
        const { body } = await supertest
          .get(`/api/monitoring/v1/_health?min=${timeRange.min}&max=${timeRange.max}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        delete body.settings;
        expect(body).to.eql(emptyResponse);
      });
    });

    describe('with metricbeat data', () => {
      const archives = [
        'x-pack/test/api_integration/apis/monitoring/es_archives/_health/monitoring_es_8',
        'x-pack/test/api_integration/apis/monitoring/es_archives/_health/monitoring_beats_8',
        METRICBEAT_ARCHIVE,
      ];
      const { setup, tearDown } = getLifecycleMethods(getService);

      before('load archive', () => {
        return setup(archives);
      });

      after('unload archive', () => {
        return tearDown([METRICBEAT_ARCHIVE]);
      });

      it('returns the state of the monitoring documents', async () => {
        const { body } = await supertest
          .get(`/api/monitoring/v1/_health?min=${timeRange.min}&max=${timeRange.max}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        delete body.settings;
        expect(body).to.eql(esBeatsResponse());
      });

      it('returns relevant settings', async () => {
        const {
          body: { settings },
        } = await supertest
          .get(`/api/monitoring/v1/_health?min=${timeRange.min}&max=${timeRange.max}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // we only test the structure of the settings and not the actual values
        // to avoid coupling our tests with any underlying changes to default
        // configuration
        const settingsType = mapValues(settings, (value) => typeof value);
        expect(settingsType).to.eql({
          ccs: 'boolean',
          logsIndex: 'string',
          metricbeatIndex: 'string',
          hasRemoteClusterConfigured: 'boolean',
        });
      });
    });

    describe('with integration package data', () => {
      const timeRange = {
        min: '2023-01-10T14:46:10.461Z',
        max: '2023-01-15T22:30:00.000Z',
      };
      const archives = [ELASTICSEARCH_PACKAGE_ARCHIVE];
      const { setup, tearDown } = getLifecycleMethods(getService);

      before('load archive', () => {
        return setup(archives);
      });

      after('unload archive', () => {
        return tearDown([ELASTICSEARCH_PACKAGE_ARCHIVE]);
      });

      it('returns the state of the monitoring documents', async () => {
        const { body } = await supertest
          .get(`/api/monitoring/v1/_health?min=${timeRange.min}&max=${timeRange.max}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        delete body.settings;
        expect(body).to.eql(esPackageResponse());
      });
    });
  });
}
