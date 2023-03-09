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

        // console.log('GET response', JSON.stringify(getResponse.body, null, 2));
        expect(getResponse.body.results.length).to.equal(sampleAssetDocs.length);
      });
    });
  });
}
