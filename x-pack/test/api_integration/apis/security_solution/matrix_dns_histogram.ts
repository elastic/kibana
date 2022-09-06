/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  MatrixHistogramQuery,
  MatrixHistogramType,
  NetworkDnsStrategyResponse,
} from '@kbn/security-solution-plugin/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Matrix DNS Histogram', () => {
    describe('Large data set', () => {
      before(
        async () =>
          await esArchiver.load(
            'x-pack/test/functional/es_archives/security_solution/matrix_dns_histogram/large_dns_query'
          )
      );

      after(
        async () =>
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/security_solution/matrix_dns_histogram/large_dns_query'
          )
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';

      it('Make sure that we get dns data without getting bucket errors when querying large volume of data', async () => {
        const networkDns = await bsearch.send<NetworkDnsStrategyResponse>({
          supertest,
          options: {
            defaultIndex: ['large_volume_dns_data'],
            docValueFields: [],
            factoryQueryType: MatrixHistogramQuery,
            histogramType: MatrixHistogramType.dns,
            filterQuery:
              '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
            isPtrIncluded: false,
            timerange: {
              interval: '12',
              to: TO,
              from: FROM,
            },
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        // This can have a odd unknown flake if we do anything more strict than this.
        const dnsCount = networkDns.rawResponse.aggregations?.dns_count as unknown as {
          value: number;
        };
        expect(dnsCount.value).to.be.above(0);
      });
    });
  });
}
