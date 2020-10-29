/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

function sortTransactionGroups(items: any[]) {
  return sortBy(items, 'impact');
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const uiFilters = encodeURIComponent(JSON.stringify({}));
  const transactionType = 'request';

  describe('Top transaction groups', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);

        expect(response.body.isAggregationAccurate).to.be(true);
        expect(response.body.items.length).to.be(0);
      });
    });

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load(archiveName);
        response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );
      });
      after(() => esArchiver.unload(archiveName));

      it('returns the correct metadata', () => {
        expect(response.status).to.be(200);
        expect(response.body.isAggregationAccurate).to.be(true);
        expect(response.body.items.length).to.be.greaterThan(0);
      });

      it('returns the correct number of buckets', () => {
        expectSnapshot(response.body.items.length).toMatchInline(`12`);
      });

      it('returns the correct buckets (when ignoring samples)', async () => {
        expectSnapshot(sortTransactionGroups(response.body.items)).toMatch();
      });
    });
  });
}
