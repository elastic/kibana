/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const { start, end } = metadata;
  const uiFilters = JSON.stringify({});

  registry.when('Throughput when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(
        url.format({
          pathname: `/api/apm/services/opbeans-node/transactions/charts/throughput`,
          query: {
            environment: 'testing',
            start,
            end,
            uiFilters,
            transactionType: 'request',
          },
        })
      );

      expect(response.status).to.be(200);

      expect(response.body.throughputTimeseries.length).to.be(0);
    });
  });

  registry.when(
    'Throughput when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: PromiseReturnType<typeof supertest.get>;

      before(async () => {
        response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-node/transactions/charts/throughput`,
            query: {
              environment: 'testing',
              start,
              end,
              uiFilters,
              transactionType: 'request',
            },
          })
        );
      });

      it('returns throughput timeseries', async () => {
        expect(response.status).to.be(200);

        expect(response.body.throughputTimeseries.length).to.be.greaterThan(0);
      });
    }
  );
}
