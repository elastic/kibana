/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createSampleAssets, deleteSampleAssets, viewSampleAssetDocs } from '../helpers';

const ASSETS_ENDPOINT = '/api/asset-manager/assets';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('asset management', () => {
    let sampleAssetDocs: AssetWithoutTimestamp[] = [];
    before(async () => {
      sampleAssetDocs = await viewSampleAssetDocs(supertest);
    });

    beforeEach(async () => {
      await deleteSampleAssets(supertest);
    });

    describe('GET /assets', () => {
      it('should return the full list of assets', async () => {
        await createSampleAssets(supertest);
        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(sampleAssetDocs.length);
      });

      it('should only return one document per asset, even if the asset has been indexed multiple times', async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60 * 1);
        const twoHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 2);
        await createSampleAssets(supertest, { baseDateTime: twoHoursAgo.toISOString() });
        await createSampleAssets(supertest, { baseDateTime: oneHourAgo.toISOString() });

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length, from: 'now-1d' })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(sampleAssetDocs.length);

        // Also make sure the returned timestamp for the documents is the more recent of the two
        expect(getResponse.body.results[0]['@timestamp']).to.equal(oneHourAgo.toISOString());
      });

      // TODO: should allow for sorting? right now the returned subset is somewhat random
      it('should allow caller to request n assets', async () => {
        await createSampleAssets(supertest);

        expect(sampleAssetDocs.length).to.be.greaterThan(5);

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: 5, from: 'now-1d' })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(5);
      });

      it('should return assets filtered by a single type', async () => {
        await createSampleAssets(supertest);

        const singleSampleType = sampleAssetDocs[0]['asset.type'];
        const samplesForType = sampleAssetDocs.filter(
          (doc) => doc['asset.type'] === singleSampleType
        );

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length, from: 'now-1d', type: singleSampleType })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(samplesForType.length);
      });

      it('should return assets filtered by multiple types (OR)', async () => {
        await createSampleAssets(supertest);

        // Dynamically grab all types from the sample asset data set
        const sampleTypeSet: Set<string> = new Set();
        for (let i = 0; i < sampleAssetDocs.length; i++) {
          sampleTypeSet.add(sampleAssetDocs[i]['asset.type']);
        }
        const sampleTypes = Array.from(sampleTypeSet);
        if (sampleTypes.length <= 2) {
          throw new Error(
            'Not enough asset type values in sample asset documents, need more than two to test filtering by multiple types'
          );
        }

        // Pick the first two unique types from the sample data set
        const filterByTypes = sampleTypes.slice(0, 2);

        // Track a reference to how many docs should be returned for these two types
        const samplesForFilteredTypes = sampleAssetDocs.filter((doc) =>
          filterByTypes.includes(doc['asset.type'])
        );

        expect(samplesForFilteredTypes.length).to.be.lessThan(sampleAssetDocs.length);

        // Request assets for multiple types (with a size matching the number of total sample asset docs)
        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length, from: 'now-1d', type: filterByTypes })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(samplesForFilteredTypes.length);
      });
    });
  });
}
