/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  TopNodesRequestRT,
  TopNodesResponseRT,
} from '../../../../plugins/infra/common/http_api/overview_api';
import { decodeOrThrow } from '../../../../plugins/infra/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const { min, max } = DATES['7.0.0'].hosts;

  describe('API /metrics/overview/top', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));

    it('works', async () => {
      const response = await supertest
        .post('/api/metrics/overview/top')
        .set({
          'kbn-xsrf': 'some-xsrf-token',
        })
        .send(
          TopNodesRequestRT.encode({
            sourceId: 'default',
            bucketSize: '300s',
            size: 5,
            timerange: {
              from: min,
              to: max,
            },
          })
        )
        .expect(200);

      const { series } = decodeOrThrow(TopNodesResponseRT)(response.body);

      expect(series.length).to.be(1);
      expect(series[0].id).to.be('demo-stack-mysql-01');
    });
  });
}
