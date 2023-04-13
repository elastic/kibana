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
const DIFF_ENDPOINT = ASSETS_ENDPOINT + '/diff';

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
    });

    describe('GET /assets/diff', () => {
      it('should reject requests that do not include the two time ranges to compare', async () => {
        const timestamp = new Date().toISOString();

        let getResponse = await supertest.get(DIFF_ENDPOINT).expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query.aFrom]: expected value of type [string] but got [undefined]'
        );

        getResponse = await supertest.get(DIFF_ENDPOINT).query({ aFrom: timestamp }).expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query.aTo]: expected value of type [string] but got [undefined]'
        );

        getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: timestamp, aTo: timestamp })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query.bFrom]: expected value of type [string] but got [undefined]'
        );

        getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: timestamp, aTo: timestamp, bFrom: timestamp })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query.bTo]: expected value of type [string] but got [undefined]'
        );

        await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: timestamp, aTo: timestamp, bFrom: timestamp, bTo: timestamp })
          .expect(200);
      });

      it('should reject requests where either time range is moving backwards in time', async () => {
        const now = new Date();
        const isoNow = now.toISOString();
        const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60 * 1).toISOString();

        let getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({
            aFrom: isoNow,
            aTo: oneHourAgo,
            bFrom: isoNow,
            bTo: isoNow,
          })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          `Time range cannot move backwards in time. "aTo" (${oneHourAgo}) is before "aFrom" (${isoNow}).`
        );

        getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({
            aFrom: isoNow,
            aTo: isoNow,
            bFrom: isoNow,
            bTo: oneHourAgo,
          })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          `Time range cannot move backwards in time. "bTo" (${oneHourAgo}) is before "bFrom" (${isoNow}).`
        );

        await supertest
          .get(DIFF_ENDPOINT)
          .query({
            aFrom: oneHourAgo,
            aTo: isoNow,
            bFrom: oneHourAgo,
            bTo: isoNow,
          })
          .expect(200);
      });

      it('should return the difference in assets present between two time ranges', async () => {
        const onlyInA = sampleAssetDocs.slice(0, 2);
        const onlyInB = sampleAssetDocs.slice(sampleAssetDocs.length - 2);
        const inBoth = sampleAssetDocs.slice(2, sampleAssetDocs.length - 2);
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60 * 1);
        const twoHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 2);
        await createSampleAssets(supertest, {
          baseDateTime: twoHoursAgo.toISOString(),
          excludeEans: inBoth.concat(onlyInB).map((asset) => asset['asset.ean']),
        });
        await createSampleAssets(supertest, {
          baseDateTime: oneHourAgo.toISOString(),
          excludeEans: onlyInA.concat(onlyInB).map((asset) => asset['asset.ean']),
        });
        await createSampleAssets(supertest, {
          excludeEans: inBoth.concat(onlyInA).map((asset) => asset['asset.ean']),
        });

        const twoHoursAndTenMinuesAgo = new Date(now.getTime() - 1000 * 60 * 130 * 1);
        const fiftyMinuesAgo = new Date(now.getTime() - 1000 * 60 * 50 * 1);
        const seventyMinuesAgo = new Date(now.getTime() - 1000 * 60 * 70 * 1);
        const tenMinutesAfterNow = new Date(now.getTime() + 1000 * 60 * 10);

        const getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({
            aFrom: twoHoursAndTenMinuesAgo,
            aTo: fiftyMinuesAgo,
            bFrom: seventyMinuesAgo,
            bTo: tenMinutesAfterNow,
          })
          .expect(200);

        expect(getResponse.body).to.have.property('onlyInA');
        expect(getResponse.body).to.have.property('onlyInB');
        expect(getResponse.body).to.have.property('inBoth');

        getResponse.body.onlyInA.forEach((asset: any) => {
          delete asset['@timestamp'];
        });
        getResponse.body.onlyInB.forEach((asset: any) => {
          delete asset['@timestamp'];
        });
        getResponse.body.inBoth.forEach((asset: any) => {
          delete asset['@timestamp'];
        });

        expect(getResponse.body.onlyInA).to.eql(onlyInA);
        expect(getResponse.body.onlyInB).to.eql(onlyInB);
        expect(getResponse.body.inBoth).to.eql(inBoth);
      });
    });
  });
}
