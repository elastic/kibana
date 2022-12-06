/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fixture from './fixtures/instance.json';
import { getLifecycleMethods } from '../../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('instance detail - metricbeat and package', () => {
    ['rules_and_actions', 'rules_and_actions_package'].forEach((source) => {
      describe(`instance detail ${source}`, () => {
        const archive = `x-pack/test/functional/es_archives/monitoring/kibana/${source}`;
        const timeRange = {
          min: '2022-05-31T18:44:19.267Z',
          max: '2022-05-31T19:59:19.267Z',
        };

        before('load archive', () => {
          return setup(archive);
        });

        after('unload archive', () => {
          return tearDown(archive);
        });

        it('should get data for the kibana instance view', async () => {
          const { body } = await supertest
            .post(
              '/api/monitoring/v1/clusters/SvjwrFv6Rvuqjm9-cSSVEg/kibana/5b2de169-2785-441b-ae8c-186a1936b17d'
            )
            .set('kbn-xsrf', 'xxx')
            .send({ timeRange })
            .expect(200);
          expect(body).to.eql(fixture);
        });
      });
    });
  });
}
