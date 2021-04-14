/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkDnsEdges,
  MatrixHistogramQuery,
  MatrixHistogramType,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Matrix DNS Histogram', () => {
    describe('Large data set', () => {
      before(() => esArchiver.load('security_solution/matrix_dns_histogram/large_dns_query'));
      after(() => esArchiver.unload('security_solution/matrix_dns_histogram/large_dns_query'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';

      it('Make sure that we get dns data without getting bucket errors when querying large volume of data', async () => {
        const { body: networkDns } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            defaultIndex: ['large_volume_dns_data'],
            docValueFields: [],
            factoryQueryType: MatrixHistogramQuery,
            histogramType: MatrixHistogramType.dns,
            filterQuery:
              '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
            isPtrIncluded: false,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            wait_for_completion_timeout: '10s',
          })
          .expect(200);
        expect(networkDns.isRunning).to.equal(false);
        expect(networkDns.rawResponse.aggregations.dns_count.value).to.equal(6604);
      });
    });
  });
}
