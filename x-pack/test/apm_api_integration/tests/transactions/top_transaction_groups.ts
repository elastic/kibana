/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

function sortTransactionGroups(items: any[]) {
  return sortBy(items, 'impact');
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const uiFilters = encodeURIComponent(JSON.stringify({}));
  const transactionType = 'request';

  registry.when(
    'Top transaction groups when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);

        expect(response.body.isAggregationAccurate).to.be(true);
        expect(response.body.items.length).to.be(0);
      });
    }
  );

  registry.when(
    'Top transaction groups when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: any;
      before(async () => {
        response = await supertest.get(
          `/api/apm/services/opbeans-node/transactions/groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );
      });

      it('returns the correct metadata', () => {
        expect(response.status).to.be(200);
        expect(response.body.isAggregationAccurate).to.be(true);
        expect(response.body.items.length).to.be.greaterThan(0);
      });

      it('returns the correct number of buckets', () => {
        expectSnapshot(response.body.items.length).toMatchInline(`13`);
      });

      it('returns the correct buckets (when ignoring samples)', async () => {
        expectSnapshot(sortTransactionGroups(response.body.items)).toMatch();
      });
    }
  );
}
