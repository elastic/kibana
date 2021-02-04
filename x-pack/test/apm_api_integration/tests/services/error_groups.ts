/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;

  registry.when('Error groups when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await supertest.get(
        url.format({
          pathname: `/api/apm/services/opbeans-java/error_groups`,
          query: {
            start,
            end,
            uiFilters: '{}',
            transactionType: 'request',
          },
        })
      );

      expect(response.status).to.be(200);

      expect(response.status).to.be(200);
      expect(response.body.error_groups).to.empty();
      expect(response.body.is_aggregation_accurate).to.eql(true);
    });
  });

  registry.when(
    'Error groups when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups`,
            query: { start, end, uiFilters: '{}', transactionType: 'request' },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body.is_aggregation_accurate).to.eql(true);
        expect(response.body.error_groups.length).to.be(5);
      });
    }
  );
}
