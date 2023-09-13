/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { createSampleAssets, deleteSampleAssets, viewSampleAssetDocs } from '../helpers';
import { ASSETS_ENDPOINT } from '../constants';

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
          sampleTypeSet.add(sampleAssetDocs[i]['asset.type']!);
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
          filterByTypes.includes(doc['asset.type']!)
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

      it('should reject requests that try to filter by both type and ean', async () => {
        const sampleType = sampleAssetDocs[0]['asset.type'];
        const sampleEan = sampleAssetDocs[0]['asset.ean'];

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ type: sampleType, ean: sampleEan })
          .expect(400);

        expect(getResponse.body.message).to.equal(
          'Filters "type" and "ean" are mutually exclusive but found both.'
        );
      });

      it('should return assets filtered by a single asset.kind value', async () => {
        await createSampleAssets(supertest);

        const singleSampleKind = sampleAssetDocs[0]['asset.kind'];
        const samplesForKind = sampleAssetDocs.filter(
          (doc) => doc['asset.kind'] === singleSampleKind
        );

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length, from: 'now-1d', kind: singleSampleKind })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(samplesForKind.length);
      });

      it('should return assets filtered by multiple asset.kind values (OR)', async () => {
        await createSampleAssets(supertest);

        // Dynamically grab all asset.kind values from the sample asset data set
        const sampleKindSet: Set<string> = new Set();
        for (let i = 0; i < sampleAssetDocs.length; i++) {
          sampleKindSet.add(sampleAssetDocs[i]['asset.kind']!);
        }
        const sampleKinds = Array.from(sampleKindSet);
        if (sampleKinds.length <= 2) {
          throw new Error(
            'Not enough asset kind values in sample asset documents, need more than two to test filtering by multiple kinds'
          );
        }

        // Pick the first two unique kinds from the sample data set
        const filterByKinds = sampleKinds.slice(0, 2);

        // Track a reference to how many docs should be returned for these two kinds
        const samplesForFilteredKinds = sampleAssetDocs.filter((doc) =>
          filterByKinds.includes(doc['asset.kind']!)
        );

        expect(samplesForFilteredKinds.length).to.be.lessThan(sampleAssetDocs.length);

        // Request assets for multiple types (with a size matching the number of total sample asset docs)
        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: sampleAssetDocs.length, from: 'now-1d', kind: filterByKinds })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(samplesForFilteredKinds.length);
      });

      it('should reject requests that try to filter by both kind and ean', async () => {
        const sampleKind = sampleAssetDocs[0]['asset.kind'];
        const sampleEan = sampleAssetDocs[0]['asset.ean'];

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ kind: sampleKind, ean: sampleEan })
          .expect(400);

        expect(getResponse.body.message).to.equal(
          'Filters "kind" and "ean" are mutually exclusive but found both.'
        );
      });

      it('should return the asset matching a single ean', async () => {
        await createSampleAssets(supertest);

        const targetAsset = sampleAssetDocs[0];
        const singleSampleEan = targetAsset['asset.ean'];

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: 5, from: 'now-1d', ean: singleSampleEan })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(1);

        const returnedAsset = getResponse.body.results[0];
        delete returnedAsset['@timestamp'];
        expect(returnedAsset).to.eql(targetAsset);
      });

      it('should return assets matching multiple eans', async () => {
        await createSampleAssets(supertest);

        const targetAssets = [sampleAssetDocs[0], sampleAssetDocs[2], sampleAssetDocs[4]];
        const sampleEans = targetAssets.map((asset) => asset['asset.ean']);
        sampleEans.push('ean-that-does-not-exist');

        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ size: 5, from: 'now-1d', ean: sampleEans })
          .expect(200);

        expect(getResponse.body).to.have.property('results');
        expect(getResponse.body.results.length).to.equal(3);

        delete getResponse.body.results[0]['@timestamp'];
        delete getResponse.body.results[1]['@timestamp'];
        delete getResponse.body.results[2]['@timestamp'];

        // The order of the expected assets is fixed
        expect(getResponse.body.results).to.eql(targetAssets);
      });

      it('should reject requests with negative size parameter', async () => {
        const getResponse = await supertest.get(ASSETS_ENDPOINT).query({ size: -1 }).expect(400);

        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /size: -1 does not match expected type pipe(ToNumber, InRange)\n  in /size: "-1" does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should reject requests with size parameter greater than 100', async () => {
        const getResponse = await supertest.get(ASSETS_ENDPOINT).query({ size: 101 }).expect(400);

        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /size: 101 does not match expected type pipe(ToNumber, InRange)\n  in /size: "101" does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should reject requests with invalid from and to parameters', async () => {
        const getResponse = await supertest
          .get(ASSETS_ENDPOINT)
          .query({ from: 'now_1p', to: 'now_1p' })
          .expect(400);

        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /from: "now_1p" does not match expected type Date\n  in /from: "now_1p" does not match expected type datemath\n  in /to: "now_1p" does not match expected type Date\n  in /to: "now_1p" does not match expected type datemath'
        );
      });
    });
  });
}
