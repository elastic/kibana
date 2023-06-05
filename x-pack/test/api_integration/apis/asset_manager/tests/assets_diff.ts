/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';

import { AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createSampleAssets, deleteSampleAssets, viewSampleAssetDocs } from '../helpers';
import { ASSETS_ENDPOINT } from '../constants';

const DIFF_ENDPOINT = `${ASSETS_ENDPOINT}/diff`;

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

    describe('GET /assets/diff', () => {
      it('should reject requests that do not include the two time ranges to compare', async () => {
        const timestamp = new Date().toISOString();

        let getResponse = await supertest.get(DIFF_ENDPOINT).expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /0/aFrom: undefined does not match expected type Date\n  in /0/aFrom: undefined does not match expected type datemath\n  in /0/aTo: undefined does not match expected type Date\n  in /0/aTo: undefined does not match expected type datemath\n  in /0/bFrom: undefined does not match expected type Date\n  in /0/bFrom: undefined does not match expected type datemath\n  in /0/bTo: undefined does not match expected type Date\n  in /0/bTo: undefined does not match expected type datemath'
        );

        getResponse = await supertest.get(DIFF_ENDPOINT).query({ aFrom: timestamp }).expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /0/aTo: undefined does not match expected type Date\n  in /0/aTo: undefined does not match expected type datemath\n  in /0/bFrom: undefined does not match expected type Date\n  in /0/bFrom: undefined does not match expected type datemath\n  in /0/bTo: undefined does not match expected type Date\n  in /0/bTo: undefined does not match expected type datemath'
        );

        getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: timestamp, aTo: timestamp })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /0/bFrom: undefined does not match expected type Date\n  in /0/bFrom: undefined does not match expected type datemath\n  in /0/bTo: undefined does not match expected type Date\n  in /0/bTo: undefined does not match expected type datemath'
        );

        getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: timestamp, aTo: timestamp, bFrom: timestamp })
          .expect(400);
        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /0/bTo: undefined does not match expected type Date\n  in /0/bTo: undefined does not match expected type datemath'
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

        const sortByEan = (assets: any[]) => sortBy(assets, (asset) => asset['asset.ean']);
        expect(sortByEan(getResponse.body.onlyInA)).to.eql(sortByEan(onlyInA));
        expect(sortByEan(getResponse.body.onlyInB)).to.eql(sortByEan(onlyInB));
        expect(sortByEan(getResponse.body.inBoth)).to.eql(sortByEan(inBoth));
      });

      it('should reject requests with invalid datemath', async () => {
        const getResponse = await supertest
          .get(DIFF_ENDPOINT)
          .query({ aFrom: 'now_1p', aTo: 'now_1p', bFrom: 'now_1p', bTo: 'now_1p' })
          .expect(400);

        expect(getResponse.body.message).to.equal(
          '[request query]: Failed to validate: \n  in /0/aFrom: "now_1p" does not match expected type Date\n  in /0/aFrom: "now_1p" does not match expected type datemath\n  in /0/aTo: "now_1p" does not match expected type Date\n  in /0/aTo: "now_1p" does not match expected type datemath\n  in /0/bFrom: "now_1p" does not match expected type Date\n  in /0/bFrom: "now_1p" does not match expected type datemath\n  in /0/bTo: "now_1p" does not match expected type Date\n  in /0/bTo: "now_1p" does not match expected type datemath'
        );
      });
    });
  });
}
