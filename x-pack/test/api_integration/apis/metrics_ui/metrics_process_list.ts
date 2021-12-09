/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ProcessListAPIRequestRT,
  ProcessListAPIResponseRT,
} from '../../../../plugins/infra/common/http_api/host_details/process_list';
import { decodeOrThrow } from '../../../../plugins/infra/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('API /metrics/process_list', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/metrics_and_apm'));
    after(() =>
      esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/metrics_and_apm')
    );

    it('works', async () => {
      const response = await supertest
        .post('/api/metrics/process_list')
        .set({
          'kbn-xsrf': 'some-xsrf-token',
        })
        .send(
          ProcessListAPIRequestRT.encode({
            hostTerm: {
              'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw',
            },
            indexPattern: 'metrics-*,metricbeat-*',
            to: 1564432800000,
            sortBy: {
              name: 'cpu',
              isAscending: false,
            },
            searchFilter: [
              {
                match_all: {},
              },
            ],
          })
        )
        .expect(200);

      const { processList, summary } = decodeOrThrow(ProcessListAPIResponseRT)(response.body);

      expect(processList.length).to.be(10);
      expect(summary.total).to.be(178);
    });
  });
}
