/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createSampleAssets, deleteSampleAssets, viewSampleAssetDocs } from './helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  async function countSampleDocs() {
    const sampleAssetDocs = await viewSampleAssetDocs(supertest);
    return sampleAssetDocs.length;
  }

  // This function performs the direct ES search using esSupertest,
  // so we don't use the assets API to test the assets API
  interface SearchESForAssetsOptions {
    size?: number;
    from?: string;
    to?: string;
  }
  async function searchESForSampleAssets({
    size = 0,
    from = 'now-24h',
    to = 'now',
  }: SearchESForAssetsOptions = {}) {
    const queryPostBody = {
      size,
      query: {
        range: {
          '@timestamp': {
            gte: from,
            lte: to,
          },
        },
      },
    };

    return await esSupertest.post('/assets-*-sample_data/_search').send(queryPostBody).expect(200);
  }

  describe('Sample Assets API', () => {
    // Clear out the asset indices before each test
    beforeEach(async () => {
      await deleteSampleAssets(supertest);
    });

    // Clear out the asset indices one last time after the last test
    after(async () => {
      await deleteSampleAssets(supertest);
    });

    it('should return the sample asset documents', async () => {
      const sampleAssetDocs = await viewSampleAssetDocs(supertest);
      expect(sampleAssetDocs.length).to.be.greaterThan(0);
    });

    it('should find no sample assets in ES at first', async () => {
      const initialResponse = await searchESForSampleAssets();
      expect(initialResponse.body.hits?.total?.value).to.equal(0);
    });

    it('should successfully create sample assets', async () => {
      const nSampleDocs = await countSampleDocs();

      const postResponse = await createSampleAssets(supertest, { refresh: true });
      expect(postResponse.status).to.equal(200);
      expect(postResponse.body?.items?.length).to.equal(nSampleDocs);

      // using 'within the past 5 minutes' to approximate whatever the 'now' time was plus query and test lag
      const searchResponse = await searchESForSampleAssets({ from: 'now-5m' });

      expect(searchResponse.body.hits?.total?.value).to.equal(nSampleDocs);
    });

    it('should delete all sample data', async () => {
      const nSampleDocs = await countSampleDocs();
      await createSampleAssets(supertest, { refresh: true });

      const responseBeforeDelete = await searchESForSampleAssets();
      expect(responseBeforeDelete.body.hits?.total?.value).to.equal(nSampleDocs);

      await deleteSampleAssets(supertest);

      const responseAfterDelete = await searchESForSampleAssets();
      expect(responseAfterDelete.body.hits?.total?.value).to.equal(0);
    });

    it('should create sample data with a timestamp in the past', async () => {
      const nSampleDocs = await countSampleDocs();

      // Create sample documents dated three days prior to now
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
      const response = await createSampleAssets(supertest, {
        refresh: true,
        baseDateTime: threeDaysAgo.toISOString(),
      });

      // Expect that all of the sample docs have been indexed
      expect(response.body?.items?.length).to.equal(nSampleDocs);

      // Searching only within the past day, we don't expect to find any of the asset documents
      const oneDayAgoResponse = await searchESForSampleAssets({ size: 1, from: 'now-1d' });
      expect(oneDayAgoResponse.body.hits?.total?.value).to.equal(0);

      // Searching within the past 5 days, we should find all of the asset documents
      const fiveDaysAgoResponse = await searchESForSampleAssets({ from: 'now-5d' });
      expect(fiveDaysAgoResponse.body.hits?.total?.value).to.equal(nSampleDocs);
    });

    it('should create sample data but exclude some documents via provided Elastic Asset Name values', async () => {
      const sampleAssetDocs = await viewSampleAssetDocs(supertest);
      const nSampleDocs = sampleAssetDocs.length;

      // We will remove the first and the last sample document, just for a test.
      // Note: This test will continue to work without any hard-coded EAN values, and
      // regardless of how those EAN values may change or expand.
      const first = sampleAssetDocs.shift();
      const last = sampleAssetDocs.pop();
      const included = sampleAssetDocs.map((doc) => doc['asset.ean']);

      if (!first || !last) {
        throw new Error('Sample asset documents were incorrectly returned');
      }

      const excluded = [first['asset.ean'], last['asset.ean']];
      const createResponse = await createSampleAssets(supertest, {
        refresh: true,
        excludeEans: excluded,
      });

      // We expect the created response should reference all sample docs, minus the 2 we excluded
      expect(createResponse.body.items.length).to.equal(nSampleDocs - 2);

      // In Elasticsearch, we should also find 2 less asset documents than the total sample docs
      const searchResponse = await searchESForSampleAssets({ size: nSampleDocs });
      expect(searchResponse.body.hits?.total?.value).to.equal(nSampleDocs - 2);

      // Lastly, we should confirm that the EAN values found in the sample docs are all
      // included in the asset documents returned from ES, minus the two we excluded
      const returnedAssetEans = searchResponse.body.hits.hits.map(
        (doc: { _source: Asset }) => doc._source['asset.ean']
      );

      included.forEach((ean) => {
        expect(returnedAssetEans).to.contain(ean);
      });

      excluded.forEach((ean) => {
        expect(returnedAssetEans).to.not.contain(ean);
      });
    });
  });
}
