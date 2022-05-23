/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../data_stream';

import esBeatsResponse from './fixtures/response_es-beats.json';
import emptyResponse from './fixtures/response-empty.json';

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

    describe('with data', () => {
      const archives = [
        'x-pack/test/api_integration/apis/monitoring/es_archives/_health/monitoring-es-8',
        'x-pack/test/api_integration/apis/monitoring/es_archives/_health/monitoring-beats-8',
      ];
      const { setup, tearDown } = getLifecycleMethods(getService);

      before('load archive', () => {
        return Promise.all(archives.map(setup));
      });

      after('unload archive', () => {
        return tearDown();
      });

      it('returns the state of the monitoring documents', async () => {
        const { body } = await supertest
          .get(`/api/monitoring/v1/_health?min=${timeRange.min}&max=${timeRange.max}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        delete body.settings;
        expect(body).to.eql(esBeatsResponse);
      });
    });
  });
}
